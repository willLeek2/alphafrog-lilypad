import { cn } from "../utils/classNames";

type FeatureCardProps = {
  title: string;
  description: string;
  tag?: string;
  className?: string;
};

const FeatureCard = ({ title, description, tag, className }: FeatureCardProps) => (
  <div
    className={cn(
      "flex h-full flex-col gap-3 rounded-2xl border border-sky-100 bg-white/80 p-5 shadow-card",
      className
    )}
  >
    {tag ? (
      <span className="w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
        {tag}
      </span>
    ) : null}
    <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
    <p className="text-sm leading-relaxed text-ink-700">{description}</p>
  </div>
);

export default FeatureCard;
