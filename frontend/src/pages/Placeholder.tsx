interface Props {
  title: string;
  stage?: string;
}

export default function Placeholder({ title, stage }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        Раздел будет реализован {stage ?? "на следующих этапах"}.
      </p>
    </div>
  );
}
