import { cn } from "../utils/classNames";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) => (
  <div
    className={cn(
      "space-y-3",
      align === "center" ? "text-center" : "text-left"
    )}
  >
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
      {eyebrow}
    </p>
    <h2 className="text-3xl font-semibold text-ink-900 md:text-4xl">{title}</h2>
    {description ? (
      <p className="text-base text-ink-700 md:text-lg">{description}</p>
    ) : null}
  </div>
);

export default SectionHeading;
