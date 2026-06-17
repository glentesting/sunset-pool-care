export default function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-teal/10 px-3 py-1 text-sm font-medium text-teal-dark">
      {children}
    </span>
  );
}
