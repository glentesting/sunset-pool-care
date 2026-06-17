import { notFound } from "next/navigation";
import ServicePage from "@/components/templates/ServicePage";
import { getService } from "@/content/services";
import type { Metadata } from "next";

const SLUG = "equipment";

export function generateMetadata(): Metadata {
  const s = getService(SLUG);
  return { title: s?.name ?? "Service", description: s?.tagline };
}

export default function Page() {
  const service = getService(SLUG);
  if (!service) notFound();
  return <ServicePage service={service} />;
}
