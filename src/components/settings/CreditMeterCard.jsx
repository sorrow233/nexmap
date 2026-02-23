export default function CreditMeterCard({
    icon: Icon,
    label,
    value,
    total,
    percent,
    containerClassName = '',
    labelClassName = '',
    valueClassName = '',
    totalClassName = '',
    progressTrackClassName = '',
    progressBarClassName = ''
}) {
    return (
        <div className={`rounded-2xl border p-4 backdrop-blur-sm ${containerClassName}`}>
            <div className="mb-3 flex items-end justify-between gap-3">
                <span className={`text-sm font-semibold ${labelClassName}`}>
                    <span className="inline-flex items-center gap-2">
                        {Icon && <Icon size={14} />}
                        {label}
                    </span>
                </span>
                <span className={`font-mono text-2xl font-black tabular-nums leading-none ${valueClassName}`}>
                    {value}
                    <span className={`ml-1 text-sm font-semibold ${totalClassName}`}>/ {total}</span>
                </span>
            </div>
            <div className={`h-3 overflow-hidden rounded-full ${progressTrackClassName}`}>
                <div
                    className={`relative h-full rounded-full transition-[width] duration-500 ${progressBarClassName}`}
                    style={{ width: `${percent}%` }}
                >
                    <div className="absolute inset-0 bg-white/25" />
                </div>
            </div>
        </div>
    );
}
