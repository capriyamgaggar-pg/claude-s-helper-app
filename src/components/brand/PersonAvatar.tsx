type Props = {
  initial: string;
  tint?: string;
  size?: number;
  className?: string;
};

export function PersonAvatar({ initial, tint = "oklch(0.93 0.04 80)", size = 36, className = "" }: Props) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border border-foreground/8 shadow-[0_6px_20px_-14px_rgba(20,20,40,0.35)] ${className}`}
      style={{ background: tint, width: size, height: size }}
    >
      <span className="text-[12px] font-medium text-foreground/70">{initial}</span>
    </div>
  );
}
