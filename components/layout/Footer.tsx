import { SITE, SERVICE_AREAS } from "@/content/site";

export default function Footer() {
  return (
    <footer className="border-t border-navy/10 px-6 py-10 text-sm text-navy/60">
      <div className="mx-auto max-w-6xl">
        <p className="font-semibold text-navy">{SITE.name}</p>
        <p className="mt-2">Serving {SERVICE_AREAS.join(", ")}.</p>
        {/* TODO: NAP block, hours, social, legal — design phase */}
      </div>
    </footer>
  );
}
