const STATUS_LABELS = {
	seed: "🌱 Seed",
	growing: "🌿 Growing",
	evergreen: "🌳 Evergreen",
};

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

function gardenNoteFromItem(item) {
	const data = item.data || {};
	const status = normalizeStatus(getUserProperty(data, "status"));
	const kind = normalizeFacetValue(getUserProperty(data, "garden-type"));
	const topics = normalizeTopics(getUserProperty(data, "topics"));
	const tags = asArray(data.tags).filter((tag) => !SYSTEM_TAGS.has(tag));
	const description =
		getUserProperty(data, "description") || getUserProperty(data, "summary") || "";

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
		updated: data.updated || data.created || "",
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
	labelFromValue,
};
