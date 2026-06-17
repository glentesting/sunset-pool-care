/** FAQ content — feeds the FAQ page and FAQ schema. TODO: real Q&A from Brent. */
export type Faq = { q: string; a: string };

export const FAQS: Faq[] = [
  { q: "What areas do you service?", a: "TODO — pulled from SERVICE_AREAS." },
  { q: "How much is weekly service?", a: "TODO — pulled from WEEKLY_SERVICE_PRICE." },
];
