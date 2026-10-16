export function SectionHead({
  icon,
  title,
  desc,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {icon}
        <h3 className="text-[14px] font-bold text-white">{title}</h3>
        {badge}
      </div>
      <p className="text-[11px] leading-5 text-fg-muted">{desc}</p>
    </div>
  );
}
