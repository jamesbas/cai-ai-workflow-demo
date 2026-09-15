"use client";

import { useEffect, useRef, useState } from "react";
import type { DemoScenario } from "@/lib/demo/scenarios";
import { Chip } from "@/components/ui";

interface ResidentOption {
  id: string;
  displayName: string;
  propertyAddress: string;
}

export function IntakeCard({
  locked,
  onCreated,
  onError,
}: {
  locked: boolean;
  onCreated: (caseId: string) => void;
  onError: (message: string) => void;
}) {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentId, setResidentId] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [sampleImage, setSampleImage] = useState("");
  const [scenarioId, setScenarioId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetch("/api/demo/scenarios")
      .then((response) => response.json())
      .then((data: { scenarios: DemoScenario[]; residents: ResidentOption[] }) => {
        setScenarios(data.scenarios);
        setResidents(data.residents);
        setResidentId((current) => current || (data.residents[0]?.id ?? ""));
      })
      .catch(() => onError("Could not load demo scenarios."));
  }, [onError]);

  function applyScenario(scenario: DemoScenario) {
    setResidentId(scenario.residentId);
    setLocation(scenario.submittedLocation);
    setNote(scenario.residentNote);
    setSampleImage(scenario.imageFile);
    setScenarioId(scenario.id);
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    setPreviewUrl(`/demo-images/${scenario.imageFile}`);
  }

  function chooseFile(selected: File | null) {
    setFile(selected);
    setSampleImage("");
    setScenarioId("");
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function submit() {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("residentId", residentId);
      form.set("submittedLocation", location);
      form.set("residentNote", note);
      if (scenarioId) form.set("scenarioId", scenarioId);
      if (file) form.set("image", file);
      else if (sampleImage) form.set("sampleImage", sampleImage);

      const response = await fetch("/api/cases", { method: "POST", body: form });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) {
        onError(data.error ?? "Could not create the maintenance request.");
        return;
      }
      onCreated(data.id);
    } catch {
      onError("Could not reach the application server.");
    } finally {
      setBusy(false);
    }
  }

  const primary = scenarios.find((scenario) => scenario.primary);
  const alternates = scenarios.filter((scenario) => !scenario.primary);
  const ready = residentId !== "" && location.trim() !== "" && note.trim() !== "" && (file !== null || sampleImage !== "");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {primary ? (
          <button
            type="button"
            disabled={locked}
            onClick={() => applyScenario(primary)}
            className="rounded-lg bg-brand px-6 py-3 text-xl font-bold text-white disabled:opacity-50"
          >
            Use keynote sample
          </button>
        ) : null}
        {alternates.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            disabled={locked}
            onClick={() => applyScenario(scenario)}
            className="rounded-lg border-2 border-brand px-5 py-3 text-lg font-semibold text-brand disabled:opacity-50"
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block">
            <span className="text-base font-bold uppercase tracking-wide text-muted">Resident</span>
            <select
              value={residentId}
              disabled={locked}
              onChange={(event) => setResidentId(event.target.value)}
              className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-xl"
            >
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.displayName} — {resident.propertyAddress}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-base font-bold uppercase tracking-wide text-muted">Location</span>
            <input
              value={location}
              disabled={locked}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="East Pool Entrance"
              className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-xl"
            />
          </label>

          <label className="block">
            <span className="text-base font-bold uppercase tracking-wide text-muted">
              Resident note
            </span>
            <textarea
              value={note}
              disabled={locked}
              rows={4}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe the issue in a sentence or two."
              className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-xl"
            />
          </label>

          <label className="block">
            <span className="text-base font-bold uppercase tracking-wide text-muted">
              Photo (JPEG, PNG, or WEBP — 8 MB maximum)
            </span>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={locked}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-lg"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-base font-bold uppercase tracking-wide text-muted">
            Submitted photo
          </span>
          <div className="flex min-h-[260px] flex-1 items-center justify-center rounded-lg border-2 border-dashed border-line bg-canvas p-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Resident submitted maintenance photo"
                className="max-h-[340px] w-auto rounded-md"
              />
            ) : (
              <p className="text-lg text-muted">No photo selected</p>
            )}
          </div>
          {sampleImage ? <Chip tone="brand">Synthetic demo image</Chip> : null}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={locked || busy || !ready}
          className="rounded-lg bg-ink px-8 py-4 text-2xl font-bold text-white disabled:opacity-40"
        >
          {busy ? "Submitting…" : "Submit request"}
        </button>
        {!ready ? (
          <p className="text-lg text-muted">Resident, location, note, and a photo are required.</p>
        ) : null}
      </div>
    </div>
  );
}
