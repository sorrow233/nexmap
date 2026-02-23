export default function CreditBenefitCard({
    icon: Icon,
    title,
    description,
    iconWrapClassName = '',
    iconClassName = '',
    containerClassName = ''
}) {
    return (
        <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${containerClassName}`}>
            <div className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${iconWrapClassName}`}>
                    {Icon && <Icon size={20} className={iconClassName} />}
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{title}</h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
                </div>
            </div>
        </div>
    );
}
