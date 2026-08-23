import { describe, expect, it } from "vitest";
import {
	gardenNoteFromItem,
	gardenNotes,
	gardenTopics,
	gardenTypes,
	normalizeStatus,
	normalizeTopics,
} from "./gardenMetadata.js";

const item = (data, overrides = {}) => ({
	fileSlug: "Example Note",
	url: "/example-note/",
	data: {
		"dg-publish": true,
		...data,
	},
	...overrides,
});

describe("garden metadata", () => {
	it("reads legacy top-level metadata", () => {
		const note = gardenNoteFromItem(
			item({
				title: "MLOps",
				status: "growing",
				type: "project",
				topics: ["mlops", "machine-learning"],
			}),
		);

		expect(note.title).toBe("MLOps");
		expect(note.status).toBe("growing");
		expect(note.statusLabel).toBe("🌿 Growing");
		expect(note.type).toBe("project");
		expect(note.topicValues).toEqual(["mlops", "machine-learning"]);
	});

	it("prefers Digital Garden nested note properties", () => {
		const note = gardenNoteFromItem(
			item({
				status: "seed",
				type: "note",
				topics: ["ai"],
				"dg-note-properties": {
					status: "evergreen",
					type: "travel",
					topics: ["Travel", "Paris"],
				},
			}),
		);

		expect(note.status).toBe("evergreen");
		expect(note.type).toBe("travel");
		expect(note.topics).toEqual([
			{ value: "travel", label: "Travel" },
			{ value: "paris", label: "Paris" },
		]);
	});

	it("normalizes missing and unsupported metadata safely", () => {
		expect(normalizeStatus("draft")).toBe("");
		expect(normalizeTopics(null)).toEqual([]);

		const note = gardenNoteFromItem(item({}));
		expect(note.status).toBe("");
		expect(note.type).toBe("");
		expect(note.topics).toEqual([]);
	});

	it("deduplicates topics and types from published non-home notes", () => {
		const notes = gardenNotes([
			item({ tags: ["gardenEntry"], topics: ["home"] }, { url: "/" }),
			item({
				title: "AI Seed",
				type: "note",
				topics: "ai",
				status: "seed",
			}),
			item({
				title: "Paris",
				"dg-note-properties": {
					type: "travel",
					topics: ["travel", "ai"],
				},
			}),
			item({ hide: true, type: "hidden", topics: ["hidden"] }),
		]);

		expect(notes.map((note) => note.title)).toEqual(["AI Seed", "Paris"]);
		expect(gardenTopics(notes)).toEqual([
			{ value: "ai", label: "AI" },
			{ value: "travel", label: "Travel" },
		]);
		expect(gardenTypes(notes)).toEqual([
			{ value: "note", label: "Note" },
			{ value: "travel", label: "Travel" },
		]);
	});
});
