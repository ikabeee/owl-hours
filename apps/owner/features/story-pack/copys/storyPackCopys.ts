import type { StoryPackStatus } from '../lib/storyPack.ts';

export const storyPackCopys = {
  sourceRequired: "A Story Pack needs a completed job, the customer's current photo consent, and before/after photos.",
  namesRequired: "The job and business need a name before a Story Pack can be created.",
  caption: (subject:string,business:string) => `Completed: ${subject} by ${business}. Need a hand? Message our team.`,
  slides: (subject:string,business:string) => [
    {title:"The job",body:`${subject}.`},
    {title:"The work",body:"Our team completed this job."},
    {title:"Need a hand?",body:`Message ${business} to discuss what you need.`},
  ],
  statusLabels: {
    draft:"Draft",
    approved:"Approved by the owner",
    published:"Published",
    rejected:"Needs changes",
  } satisfies Record<StoryPackStatus,string>,
  demoBusiness:"Local Service Team (demo)",
  demoJob:"Completed customer project",
  demoBefore:"Before · synthetic test image",
  demoAfter:"After · synthetic test image",
  syntheticBefore:"SYNTHETIC TEST BEFORE",
  syntheticAfter:"SYNTHETIC TEST AFTER",
  syntheticDisclaimer:"FICTIONAL JOB · NO CUSTOMER DATA",
} as const;
