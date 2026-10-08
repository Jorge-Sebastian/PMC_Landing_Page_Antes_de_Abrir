type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  titleId?: string;
};

/** Encabezado de sección reutilizado por toda la página principal. */
export const SectionHeading = ({
  title,
  subtitle,
  align = "center",
  titleId,
}: SectionHeadingProps) => (
  <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
    <h2 id={titleId} className="text-2xl leading-tight sm:text-3xl">
      {title}
    </h2>
    {subtitle ? <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p> : null}
  </div>
);
