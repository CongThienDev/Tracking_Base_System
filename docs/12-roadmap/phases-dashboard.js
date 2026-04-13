const phases = [
  {
    id: 0,
    name: "Phase 0 - Foundation Freeze",
    status: "done",
    objective: "Lock docs baseline and execution rules.",
    deliverables: [
      "Confirm core invariants (event_id, store-before-send, dedup, privacy)",
      "Lock scope and non-goals",
      "Prepare working issue list per phase"
    ],
    exitCriteria: ["Baseline docs accepted and stable for implementation start."],
    flowImpact:
      "Sets one source of truth so all later API, worker, and integration behavior stays consistent."
  },
  {
    id: 1,
    name: "Phase 1 - Ingestion Core",
    status: "done",
    objective: "Receive and persist canonical events.",
    deliverables: ["POST /track", "Validation + enrichment", "Idempotent insert by event_id"],
    exitCriteria: ["Duplicate event_id requests do not create extra rows."],
    flowImpact: "Creates the canonical event foundation before any routing side effects."
  },
  {
    id: 2,
    name: "Phase 2 - Async Routing Skeleton",
    status: "done",
    objective: "Move destination delivery out of ingestion hot path.",
    deliverables: ["BullMQ + Redis", "event_deliveries state", "Retry policy + worker skeleton"],
    exitCriteria: ["Ingestion success no longer depends on destination availability."],
    flowImpact: "Decouples write path from outbound vendor calls, improving reliability."
  },
  {
    id: 3,
    name: "Phase 3 - Meta Integration",
    status: "done",
    objective: "Implement first real downstream destination.",
    deliverables: ["Meta mapper/client", "Stable event_id + identity fields", "Meta payload tests"],
    exitCriteria: ["Canonical events are delivered correctly to Meta with dedup-safe identity."],
    flowImpact: "Validates real adapter pattern and production retry/terminal classification."
  },
  {
    id: 4,
    name: "Phase 4 - TikTok and Google",
    status: "done",
    objective: "Complete MVP downstream destination coverage.",
    deliverables: ["TikTok adapter", "Google conversion adapter with gclid", "Destination-specific retries"],
    exitCriteria: ["All required destinations process canonical events correctly."],
    flowImpact: "Completes main destination fan-out and routing confidence."
  },
  {
    id: 5,
    name: "Phase 5 - Frontend and Server Client Contract",
    status: "done",
    objective: "Make integration from other repos reliable.",
    deliverables: [
      "Lightweight tracking client/snippet contract",
      "Auto page_view",
      "session_id lifecycle rules",
      "Same event_id propagation to browser pixel callback"
    ],
    exitCriteria: ["Reference client sends end-to-end payloads with stable contract behavior."],
    flowImpact:
      "Makes external repo integration predictable and keeps browser/server event identity aligned."
  },
  {
    id: 6,
    name: "Phase 6 - Ops and Security Hardening",
    status: "not_started",
    objective: "Production readiness on operations and security.",
    deliverables: ["Observability baseline", "Runbooks", "Auth/signing + rate-limit policy"],
    exitCriteria: ["Service is operable with clear failure recovery and security controls."],
    flowImpact: "Prevents silent failures and reduces production risk."
  },
  {
    id: 7,
    name: "Phase 7 - UAT and Cutover",
    status: "not_started",
    objective: "Controlled production adoption.",
    deliverables: ["Canary rollout", "Parity checks", "Rollback strategy"],
    exitCriteria: ["Rollout accepted with stable conversion integrity."],
    flowImpact: "Moves from technical readiness to controlled business rollout."
  }
];

const phaseGrid = document.getElementById("phaseGrid");
const filters = document.querySelectorAll("[data-filter]");

const detailTitle = document.getElementById("detailTitle");
const detailObjective = document.getElementById("detailObjective");
const detailDeliverables = document.getElementById("detailDeliverables");
const detailExitCriteria = document.getElementById("detailExitCriteria");
const detailFlowImpact = document.getElementById("detailFlowImpact");

const progressRing = document.getElementById("progressRing");
const progressText = document.getElementById("progressText");
const doneCount = document.getElementById("doneCount");
const activeCount = document.getElementById("activeCount");
const pendingCount = document.getElementById("pendingCount");

let activeFilter = "all";

function countStatus(status) {
  return phases.filter((phase) => phase.status === status).length;
}

function renderSummary() {
  const done = countStatus("done");
  const inProgress = countStatus("in_progress");
  const pending = countStatus("not_started");
  const percent = Math.round((done / phases.length) * 100);
  const degrees = Math.round((percent / 100) * 360);

  doneCount.textContent = String(done);
  activeCount.textContent = String(inProgress);
  pendingCount.textContent = String(pending);

  progressText.textContent = `${percent}%`;
  progressRing.style.background = `conic-gradient(var(--ok) ${degrees}deg, var(--line) ${degrees}deg)`;
}

function toPhaseCard(phase) {
  const card = document.createElement("button");
  card.className = "phase-card";
  card.type = "button";
  card.innerHTML = `
    <h3>${phase.name}</h3>
    <p>${phase.objective}</p>
    <span class="badge ${phase.status}">${phase.status.replace("_", " ")}</span>
  `;

  card.addEventListener("click", () => selectPhase(phase.id));
  return card;
}

function selectPhase(phaseId) {
  const phase = phases.find((x) => x.id === phaseId);
  if (!phase) {
    return;
  }

  detailTitle.textContent = phase.name;
  detailObjective.textContent = phase.objective;

  detailDeliverables.innerHTML = "";
  for (const item of phase.deliverables) {
    const li = document.createElement("li");
    li.textContent = item;
    detailDeliverables.appendChild(li);
  }

  detailExitCriteria.innerHTML = "";
  for (const item of phase.exitCriteria) {
    const li = document.createElement("li");
    li.textContent = item;
    detailExitCriteria.appendChild(li);
  }

  detailFlowImpact.textContent = phase.flowImpact;
}

function renderGrid() {
  phaseGrid.innerHTML = "";

  const filtered =
    activeFilter === "all" ? phases : phases.filter((phase) => phase.status === activeFilter);

  for (const phase of filtered) {
    phaseGrid.appendChild(toPhaseCard(phase));
  }
}

for (const chip of filters) {
  chip.addEventListener("click", () => {
    activeFilter = chip.dataset.filter || "all";
    filters.forEach((btn) => btn.classList.remove("is-active"));
    chip.classList.add("is-active");
    renderGrid();
  });
}

renderSummary();
renderGrid();
selectPhase(5);
