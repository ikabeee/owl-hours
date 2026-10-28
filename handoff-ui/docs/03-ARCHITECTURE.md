# Architecture: Zukki

Companion to `02-HANDOFF.md`. These are the same eight diagrams as `architecture/architecture.html`, written in Mermaid so they can be read as text.

## 1. Components

```mermaid
flowchart TB
  subgraph People["People and surfaces"]
    C[Customer<br/>WhatsApp, talks to Zukki]
    OA[Business app · Expo<br/>requests, chats, profile, content]
    PIG[Page + Instagram]
  end
  subgraph Backend["Zukki backend"]
    WA[WhatsApp Cloud API<br/>one shared number]
    ZO[Zukki orchestrator<br/>routes by input type,<br/>sends every WhatsApp reply]
    subgraph PL[Platform API]
      DIR[Directory + matching]
      HO[Handoff + 5-minute timer]
      REL[Owner chat relay + polish]
      PUSH[Push to owners]
      CS[Content studio]
    end
    GR[Graph API]
  end
  subgraph Services
    subgraph META[Meta Model API]
      VT[Voice Transcribe]
      SAM[SAM 3.1]
      SP[Muse Spark 1.3]
      MI[Muse Image]
    end
    subgraph SB[Supabase]
      PG[(Postgres · RLS per tenant)]
      ST[(Storage)]
      RT[Realtime]
    end
  end
  C <-->|video, voice, text| WA
  WA -->|webhook| ZO
  ZO -->|send| WA
  ZO -->|match| PL
  PL -->|relay owner messages| ZO
  OA <-->|accept, chat, approve| PL
  ZO -->|route by input type| META
  PL -->|polish, images| META
  PL <-->|tenants, chats, jobs| SB
  PL --> GR -->|publish after approval| PIG
```

## 2. Multimodal routing

```mermaid
flowchart LR
  subgraph IN[Inputs]
    V[Video]
    VN[Voice note]
    OV[Owner hold-to-talk]
    TX[Text and taps]
    PH[Job photos]
  end
  subgraph PREP[Route and prepare]
    FS[Frame sampler]
    VT[Voice Transcribe<br/>file / realtime]
    BR[(Active tenant's rules)]
    CC{Consent check}
  end
  subgraph UND[Understand]
    SAM[SAM 3.1]
    SP[Muse Spark 1.3]
    MI[Muse Image]
  end
  subgraph OUT[Outputs]
    MF[Marked frame · drawn by our code]
    TR[Text reply + buttons]
    TJ[Ticket / handoff summary]
    OQ[Suggestion for the owner]
    AD[Post image]
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

## 3. Zukki finds a business

```mermaid
sequenceDiagram
  participant C as Customer
  participant WA as WhatsApp
  participant Z as Zukki
  participant M as Meta models
  participant P as Platform API
  participant DB as Supabase
  participant O as Owner app
  C->>WA: video + voice note
  WA->>Z: webhook
  Z->>M: transcribe, SAM, Spark
  M-->>Z: plumbing, urgent
  Z->>C: safety question + valve frame
  C->>Z: Done, no cables
  Z->>C: location request
  C->>Z: shares location
  Z->>P: find plumbers open near
  P->>DB: area, hours, night jobs
  DB-->>P: Northside, Eastside
  P-->>Z: best match: Northside
  Z->>C: business card + Connect me
  C->>Z: taps Connect me
  Z->>P: hand off to Northside
  P->>O: push: new request (accept within 5 min if urgent, 30 otherwise)
  O->>P: owner taps Accept
  P-->>Z: accepted
  Z->>C: you're talking with Northside
```

## 4. The owner chats through Zukki

```mermaid
sequenceDiagram
  participant C as Customer
  participant Z as Zukki
  participant M as Meta models
  participant P as Platform API
  participant O as Owner app
  C->>Z: is someone coming tonight?
  Z->>P: route to Northside's chat
  P->>O: realtime message
  alt Option A · sent as written
    O->>P: owner writes, polish off
    P->>Z: relay as written
    Z->>C: "Northside Plumbing · Mario: ..."
  else Option B · polished by Zukki, chosen by the owner
    O->>P: owner writes, polish on
    P->>M: polish (Muse Spark)
    M-->>P: clear version
    P->>O: show both versions
    O->>P: owner picks Zukki's
    P->>Z: relay approved text
    Z->>C: interactive message, footer "Written with Zukki, approved by Northside" + buttons
  end
```

## 5. Handoff states

```mermaid
stateDiagram-v2
  [*] --> with_zukki
  with_zukki --> matched: Zukki picks one
  matched --> matched: customer asks for another option
  matched --> offered: customer taps Connect
  offered --> accepted: owner accepts in time (5 min urgent / 30 min other)
  offered --> matched: no answer or declined → next business
  accepted --> chatting
  chatting --> chatting: customer types "Zukki" (assistant answers, chat stays open)
  chatting --> [*]: job states continue (quoted → … → done)
```

## 6. Many businesses, one Zukki

```mermaid
flowchart LR
  N[Zukki's number<br/>shared] --> PL[Platform API<br/>tenant resolver:<br/>chat → handoff → tenant]
  DI[Directory index<br/>public fields only] -.->|match| PL
  PL -->|one active tenant| T1
  subgraph T1[Northside]
    a1[Profile, prices, fees · public]
    b1[Hours, service area · public]
    c1[Chats, customers · private]
    d1[Accounts, posts · private]
  end
  subgraph T2[Eastside]
    a2[Profile, prices, fees · public]
    b2[Hours, service area · public]
    c2[Chats, customers · private]
    d2[Accounts, posts · private]
  end
  DI -.-> a1
  DI -.-> b1
  DI -.-> a2
  DI -.-> b2
```

Every table carries `tenant_id`, and Postgres row-level security enforces it.

## 7. Content for the business's accounts

```mermaid
flowchart LR
  JP[Job photos<br/>only with consent] --> CS
  PR[Profile, prices] --> CS
  CS[Content studio<br/>Muse Spark: caption, best time<br/>Muse Image: image] --> DR[Drafts]
  DR --> OR{Owner review<br/>Expo app}
  OR -->|regenerate| CS
  OR -->|approved| GR[Graph API → Page + Instagram professional]
  LA[Linked accounts<br/>tokens per business] -.-> GR
```

## 8. Inside Zukki

```mermaid
flowchart LR
  T[Transcript] --> S
  F[Video frames] --> S
  G[SAM signals] --> S
  B[Active tenant's context] --> S
  S[Zukki · Muse Spark 1.3<br/>local businesses only]
  S --> R[Read<br/>search_directory<br/>get_business_profile<br/>get_price_rules]
  S --> Wr[Write<br/>create_handoff<br/>propose_transition]
  S --> Tk[Talk<br/>send_whatsapp_message<br/>suggest_reply_to_owner<br/>polish_owner_message]
  PG[(Postgres)] --> R
  Wr --> V{State validator<br/>plain code}
  V -->|valid only| PG
  Tk --> OUT[WhatsApp or business app]
```
