import { describe, expect, it } from "vitest";
import {
	gardenNoteFromItem,
	gardenHubs,
	gardenNotes,
	gardenTopics,
	gardenKinds,
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
				"garden-type": "project",
				topics: ["mlops", "machine-learning"],
			}),
		);

		expect(note.title).toBe("MLOps");
		expect(note.status).toBe("growing");
		expect(note.statusLabel).toBe("🌿 Growing");
		expect(note.kind).toBe("project");
		expect(note.topicValues).toEqual(["mlops", "machine-learning"]);
	});

	it("uses garden-type for note kind", () => {
		const note = gardenNoteFromItem(
			item({
				title: "Job Search",
				"garden-type": "hub",
			}),
		);

		expect(note.kind).toBe("hub");
		expect(note.kindLabel).toBe("Hub");
	});

	it("prefers Digital Garden nested note properties", () => {
		const note = gardenNoteFromItem(
			item({
				status: "seed",
				"garden-type": "project",
				topics: ["ai"],
				"dg-note-properties": {
					status: "evergreen",
					"garden-type": "travel",
					topics: ["Travel", "Paris"],
				},
			}),
		);

		expect(note.status).toBe("evergreen");
		expect(note.kind).toBe("travel");
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
		expect(note.kind).toBe("");
		expect(note.topics).toEqual([]);
	});

	it("deduplicates topics and kinds from published non-home notes", () => {
		const notes = gardenNotes([
			item({ tags: ["gardenEntry"], topics: ["home"] }, { url: "/" }),
			item({
				title: "AI Seed",
				"garden-type": "note",
				topics: "ai",
				status: "seed",
			}),
			item({
				title: "Paris",
				"dg-note-properties": {
					"garden-type": "travel",
					topics: ["travel", "ai"],
				},
			}),
			item({ hide: true, "garden-type": "hidden", topics: ["hidden"] }),
		]);

		expect(notes.map((note) => note.title)).toEqual(["AI Seed", "Paris"]);
		expect(gardenTopics(notes)).toEqual([
			{ value: "ai", label: "AI" },
			{ value: "travel", label: "Travel" },
		]);
		expect(gardenKinds(notes)).toEqual([
			{ value: "note", label: "Note" },
			{ value: "travel", label: "Travel" },
		]);
	});

	it("supports hub as an intentional content type", () => {
		const notes = gardenNotes([
			item({
				title: "Machine Learning",
				"garden-type": "hub",
				status: "growing",
				topics: ["machine-learning"],
			}),
			item({
				title: "Books",
				"dg-note-properties": {
					"garden-type": "hub",
					status: "seed",
					topics: ["books"],
				},
			}),
			item({
				title: "Regular Note",
				"garden-type": "note",
				topics: ["machine-learning"],
			}),
		]);

		expect(notes.map((note) => [note.title, note.kind, note.kindLabel])).toEqual([
			["Books", "hub", "Hub"],
			["Machine Learning", "hub", "Hub"],
			["Regular Note", "note", "Note"],
		]);
		expect(gardenKinds(notes)).toContainEqual({ value: "hub", label: "Hub" });
		expect(gardenHubs(notes).map((note) => note.title)).toEqual([
			"Books",
			"Machine Learning",
		]);
	});
});
