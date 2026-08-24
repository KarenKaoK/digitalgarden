const STATUS_LABELS = {
	seed: "🌱 Seed",
	growing: "🌿 Growing",
	evergreen: "🌳 Evergreen",
};

const { extractLinks } = require("./linkUtils");

const ACRONYM_LABELS = {
	ai: "AI",
	mlops: "MLOps",
};

const KIND_LABELS = {
	hub: "Hub",
};

const SYSTEM_TAGS = new Set(["gardenEntry", "note"]);

function getUserProperty(data, key) {
	if (!data || typeof data !== "object") return undefined;
	const nested = data["dg-note-properties"];
	if (nested && Object.prototype.hasOwnProperty.call(nested, key)) {
		return nested[key];
	}
	return data[key];
}

function asArray(value) {
	if (Array.isArray(value)) return value;
	if (value == null || value === "") return [];
	return [value];
}

function normalizeFacetValue(value) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-");
}

function labelFromValue(value) {
	const normalized = normalizeFacetValue(value);
	if (ACRONYM_LABELS[normalized]) return ACRONYM_LABELS[normalized];
	if (KIND_LABELS[normalized]) return KIND_LABELS[normalized];

	return String(value || "")
		.trim()
		.replace(/[-_]+/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeStatus(value) {
	const status = normalizeFacetValue(value);
	return STATUS_LABELS[status] ? status : "";
}

function normalizeTopics(value) {
	const seen = new Set();
	return asArray(value)
		.map((topic) => {
			const normalized = normalizeFacetValue(topic);
			if (!normalized || seen.has(normalized)) return null;
			seen.add(normalized);
			return {
				value: normalized,
				label: labelFromValue(topic),
			};
		})
		.filter(Boolean);
}

function isHomeNote(item) {
	const tags = asArray(item?.data?.tags);
	return item?.url === "/" || tags.includes("gardenEntry");
}

function isPublishedGardenNote(item) {
	if (!item || !item.data) return false;
	if (item.data.hide || isHomeNote(item)) return false;
	return item.data["dg-publish"] === true;
}

function toTimestamp(value) {
	if (!value) return 0;
	const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
	return Number.isNaN(time) ? 0 : time;
}

function gardenNoteFromItem(item) {
	const data = item.data || {};
	const status = normalizeStatus(getUserProperty(data, "status"));
	const kind = normalizeFacetValue(getUserProperty(data, "garden-type"));
	const topics = normalizeTopics(getUserProperty(data, "topics"));
	const tags = asArray(data.tags).filter((tag) => !SYSTEM_TAGS.has(tag));
	const description =
		getUserProperty(data, "description") || getUserProperty(data, "summary") || "";
	const updated = getUserProperty(data, "updated") || getUserProperty(data, "created") || item.date || "";

	return {
		title: getUserProperty(data, "title") || data.title || item.fileSlug,
		url: item.url,
		status,
		statusLabel: status ? STATUS_LABELS[status] : "",
		kind,
		kindLabel: kind ? labelFromValue(kind) : "",
		topics,
		topicValues: topics.map((topic) => topic.value),
		description,
		updated,
		updatedTimestamp: toTimestamp(updated),
		tags,
	};
}

function gardenNotes(collection) {
	return (collection || [])
		.filter(isPublishedGardenNote)
		.map(gardenNoteFromItem)
		.sort((a, b) => a.title.localeCompare(b.title));
}

function uniqueFacets(notes, selector) {
	const map = new Map();
	for (const note of notes || []) {
		for (const facet of asArray(selector(note))) {
			if (!facet) continue;
			if (typeof facet === "string") {
				map.set(facet, labelFromValue(facet));
			} else if (facet.value) {
				map.set(facet.value, facet.label || labelFromValue(facet.value));
			}
		}
	}
	return [...map.entries()]
		.map(([value, label]) => ({ value, label }))
		.sort((a, b) => a.label.localeCompare(b.label));
}

function gardenTopics(notes) {
	return uniqueFacets(notes, (note) => note.topics);
}

function gardenKinds(notes) {
	return uniqueFacets(notes, (note) => note.kind);
}

function gardenHubs(notes) {
	return (notes || []).filter((note) => note.kind === "hub");
}

function gardenRecentNotes(notes, limit = 3) {
	return [...(notes || [])]
		.sort((a, b) => {
			const byUpdated = (b.updatedTimestamp || 0) - (a.updatedTimestamp || 0);
			return byUpdated || a.title.localeCompare(b.title);
		})
		.slice(0, limit);
}

function noteStem(item) {
	return (item?.filePathStem || "").replace("/notes/", "").replace(/^\/+/, "");
}

function titleForItem(item) {
	return getUserProperty(item?.data || {}, "title") || item?.data?.title || item?.fileSlug || "";
}

function buildSequenceIndex(collection) {
	const notes = (collection || []).filter(isPublishedGardenNote);
	const byStem = new Map();
	const byBasename = new Map();

	for (const item of notes) {
		const stem = noteStem(item);
		if (!stem || !item.url) continue;
		byStem.set(stem, item);

		const basename = stem.split("/").pop();
		if (basename && !byBasename.has(basename)) {
			byBasename.set(basename, item);
		} else if (basename) {
			byBasename.set(basename, null);
		}
	}

	return { notes, byStem, byBasename };
}

function resolveSequenceLink(link, index) {
	const normalized = String(link || "").replace(/^\/+/, "").replace(/\/$/, "");
	return index.byStem.get(normalized) || index.byBasename.get(normalized) || null;
}

async function hubSequenceFromItem(hub, index) {
	const templateContent = await hub.template.read();
	const content = templateContent?.content || "";
	const stem = noteStem(hub);
	const seen = new Set();
	const links = [];

	for (const link of extractLinks(content, stem)) {
		const item = resolveSequenceLink(link, index);
		if (!item || item.url === hub.url || seen.has(item.url)) continue;
		seen.add(item.url);
		links.push({
			title: titleForItem(item),
			url: item.url,
		});
	}

	return {
		hub: {
			title: titleForItem(hub),
			url: hub.url,
		},
		links,
	};
}

async function gardenSequenceNav(collection, currentUrl) {
	if (!currentUrl) return null;
	const index = buildSequenceIndex(collection);
	const hubs = index.notes.filter(
		(item) => normalizeFacetValue(getUserProperty(item.data, "garden-type")) === "hub",
	);
	const sequences = [];

	for (const hub of hubs) {
		const sequence = await hubSequenceFromItem(hub, index);
		const currentIndex = sequence.links.findIndex((link) => link.url === currentUrl);
		if (currentIndex === -1) continue;
		sequences.push({ ...sequence, currentIndex });
	}

	if (!sequences.length) return null;
	sequences.sort((a, b) => b.links.length - a.links.length || a.hub.title.localeCompare(b.hub.title));

	const sequence = sequences[0];
	const previous =
		sequence.currentIndex > 0 ? sequence.links[sequence.currentIndex - 1] : sequence.hub;
	const next =
		sequence.currentIndex < sequence.links.length - 1
			? sequence.links[sequence.currentIndex + 1]
			: null;

	return {
		hub: sequence.hub,
		previous,
		next,
	};
}

module.exports = {
	STATUS_LABELS,
	getUserProperty,
	normalizeStatus,
	normalizeTopics,
	gardenNoteFromItem,
	gardenNotes,
	gardenTopics,
	gardenKinds,
	gardenHubs,
	gardenRecentNotes,
	gardenSequenceNav,
	labelFromValue,
};
