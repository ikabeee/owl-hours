# Architecture: Two Agents, One Confirmed Job

Companion to `02-HANDOFF.md`. These are the same five diagrams as the shared architecture page, written in Mermaid so they can be read as text.

## 1. Components

```mermaid
flowchart TB
  subgraph People["People and surfaces"]
    C[Customer<br/>WhatsApp on Android]
    MP[Facebook Marketplace<br/>finds the business]
    BA[Business app · Expo<br/>owner + technician]
  end
  subgraph Backend["Channels and our backend"]
    WA[WhatsApp Cloud API]
    API[API · Node + Hono<br/>/webhook/whatsapp /jobs /voice /studio]
    W[Worker + agent<br/>media, models, tools, state validator]
    PUSH[Expo push]
    GRAPH[Pages / Graph API]
  end
  subgraph Services
    subgraph SB[Supabase]
      PG[(Postgres)]
      ST[(Storage)]
      RT[Realtime]
    end
    subgraph META[Meta Model API]
      VT[Voice Transcribe]
      SAM[SAM 3.1]
      SPARK[Muse Spark 1.3]
      IMG[Muse Image · ads only]
    end
  end
  C <-->|chat, video, voice| WA
  MP -.->|click-to-WhatsApp| WA
  WA -->|webhook| API
  API -->|send| WA
  API -->|enqueue| W
  W -->|transcribe · segment · reason| META
  W -->|media, tickets, events| SB
  API <-->|read / write| PG
  BA <-->|confirm, voice, location| API
  W --> PUSH -->|urgent request| BA
  W -->|publish ad| GRAPH
  RT -.->|new jobs, status| BA
```

## 1b. Multimodal pipeline

```mermaid
flowchart LR
  subgraph IN[Inputs]
    V[Video 0:14]
    VN[Voice note]
    OV[Owner's voice<br/>hold to talk]
    TX[Text and button taps]
    PH[Job photos<br/>before / after]
  end
  subgraph PREP[Prepare]
    FS[Frame sampler<br/>key frames]
    VT[Voice Transcribe<br/>file for voice notes,<br/>realtime for the owner]
    BR[(Business rules<br/>prices, hours, van stock)]
    CC{Consent check}
  end
  subgraph UND[Understand]
    SAM[SAM 3.1<br/>shut-off valve, water puddle]
    SP[Muse Spark 1.3<br/>text + key frames +<br/>SAM detections + rules]
    MI[Muse Image<br/>edits real photos]
  end
  subgraph OUT[Outputs]
    MF[Marked frame<br/>overlay drawn by our code]
    TR[Text reply + buttons]
    TJ[Ticket JSON]
    OQ[Question for the owner]
    AD[Ad image]
  end
  V --> FS --> SAM
  FS -->|key frames| SP
  VN --> VT
  OV --> VT
  VT -->|text| SP
  TX --> SP
  BR --> SP
  SAM -->|boxes, puddle signal| SP
  SAM -->|valve box| MF
  SP --> TR
  SP --> TJ
  SP --> OQ
  PH -.-> CC -.-> MI -.-> AD
```

No text-to-speech: replies are text. Muse Spark never receives raw audio. Safety images are real frames with a code-drawn overlay; Muse Image is used only for ads, after consent.

## 2. From a video to a quote

```mermaid
sequenceDiagram
  participant C as Customer
  participant WA as WhatsApp
  participant API
  participant W as Worker + agent
  participant M as Meta models
  participant DB as Supabase
  participant BA as Business app
  C->>WA: video + voice note
  WA->>API: webhook (media IDs)
  API-->>WA: 200 OK right away
  API->>W: enqueue
  W->>WA: download media
  W->>DB: save video + audio
  W->>M: Voice Transcribe
  M-->>W: transcript
  W->>M: SAM: shut-off valve, water puddle
  M-->>W: boxes, puddle growing (signal)
  W->>M: Muse Spark (frames, transcript, signals, tools)
  M-->>W: tool calls, ticket JSON (zod-validated)
  W->>DB: job: requested → triaged → proposed
  W->>WA: safety question + valve frame (overlay drawn by our code)
  WA->>C: message + reply buttons
  DB->>BA: realtime: new urgent job (+ push)
```

## 3. The owner confirms, the customer approves

```mermaid
sequenceDiagram
  participant C as Customer
  participant WA as WhatsApp
  participant API
  participant W as Worker + agent
  participant M as Meta models
  participant DB as Supabase
  participant BA as Business app
  BA->>API: open job, see the assistant's question
  BA->>API: hold to talk (audio stream)
  API->>M: realtime transcribe
  M-->>API: "Yes, pick one up"
  API->>W: interpret reply
  W->>DB: quote: arrival 12:55 AM
  BA->>API: owner taps Confirm and send (HUMAN GATE 1)
  API->>DB: proposed → owner_confirmed
  API->>WA: visit request (interactive message)
  WA->>C: card + buttons
  C->>WA: taps Approve visit (HUMAN GATE 2)
  WA->>API: webhook (button reply)
  API->>DB: → customer_approved, unlock address
  DB->>BA: approved: send Mario
  BA->>API: technician location every few seconds
  API->>WA: location / tracking link
  WA->>C: Mario is on the way
```

## 4. Job states

```mermaid
stateDiagram-v2
  [*] --> requested
  requested --> triaged: agent
  triaged --> proposed: agent
  proposed --> owner_confirmed: owner (tap)
  owner_confirmed --> customer_approved: customer (WhatsApp button)
  customer_approved --> en_route: technician
  en_route --> on_site: technician
  on_site --> done: technician
  done --> [*]
  requested --> cancelled
  triaged --> cancelled
  proposed --> declined: owner
  proposed --> cancelled
  owner_confirmed --> cancelled
  customer_approved --> cancelled
  en_route --> cancelled
```

Rules: the model can only *propose* a transition. Code validates both the transition and the actor, and writes every move to `job_events`.

## 5. Inside the agent

```mermaid
flowchart LR
  T[Transcript] --> S
  F[Video frames] --> S
  G[SAM signals] --> S
  B[Business context<br/>prices, hours, van stock] --> S
  S[Muse Spark 1.3<br/>one business only<br/>tool calling + structured output]
  S --> R[Read tools<br/>get_price_rules<br/>check_availability<br/>check_van_stock]
  S --> Wr[Write tools<br/>create_or_update_ticket<br/>propose_transition]
  S --> Tk[Talk tools<br/>send_whatsapp_message<br/>ask_owner]
  PG[(Postgres)] --> R
  Wr --> V{State validator<br/>plain code}
  V -->|valid only| PG
  Tk --> OUT[WhatsApp or business app]
```
