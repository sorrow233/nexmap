
import React from 'react';

export const LegalLayout = ({ title, children }) => (
    <div className="min-h-screen bg-slate-950 text-slate-300 py-20 px-4 md:px-8 font-sans">
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8 pb-4 border-b border-white/10">{title}</h1>
            <div className="space-y-8 text-sm leading-relaxed legal-content">
                {children}
            </div>
            <div className="mt-12 pt-8 border-t border-white/10 text-center">
                <a href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors">← Back to Home</a>
            </div>
        </div>
    </div>
);

export const Tokushoho = () => (
    <LegalLayout title="特定商取引法に基づく表記">
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-y-6 gap-x-4">
            <div className="font-bold text-slate-400">販売事業者名</div>
            <div>HU KANG</div>

            <div className="font-bold text-slate-400">代表者または運営統括責任者</div>
            <div>HU KANG</div>

            <div className="font-bold text-slate-400">所在地</div>
            <div>請求があった場合、遅滞なく開示します。</div>

            <div className="font-bold text-slate-400">お問い合わせ</div>
            <div>
                sorrowful2233@gmail.com<br />
                <span className="text-xs text-slate-500">※お問い合わせはメールにてお願いいたします。</span>
            </div>

            <div className="font-bold text-slate-400">電話番号</div>
            <div>請求があった場合、遅滞なく開示します。</div>

            <div className="font-bold text-slate-400">販売価格</div>
            <div>購入手続きの際に画面に表示されます。</div>

            <div className="font-bold text-slate-400">販売価格以外に必要な費用</div>
            <div>インターネット接続料金、通信料金等はお客様の負担となります。</div>

            <div className="font-bold text-slate-400">代金の支払方法</div>
            <div>クレジットカード決済 (Stripe)</div>

            <div className="font-bold text-slate-400">代金の支払時期</div>
            <div>ご利用のクレジットカード会社の締め日や契約内容により異なります。</div>

            <div className="font-bold text-slate-400">商品の引渡時期</div>
            <div>決済完了後、直ちにご利用いただけます。</div>

            <div className="font-bold text-slate-400">返品・交換・キャンセル等</div>
            <div>デジタルコンテンツの性質上、購入後の返品・キャンセル・交換は原則としてお受けできません。</div>
        </div>
    </LegalLayout>
);

export const Privacy = () => (
    <LegalLayout title="Privacy Policy">
        <section>
            <h3 className="text-lg font-bold text-white mb-2">1. Introduction</h3>
            <p>NexMap respects your privacy. This policy explains how we handle your data.</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">2. Data Collection</h3>
            <p>We collect your email address for account authentication via Google Firebase. We do not store your credit card information; payments are processed securely by Stripe.</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">3. Data Usage</h3>
            <p>Your data is used solely to provide and improve the NexMap service. We do not sell your personal data to third parties.</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">4. AI Processing</h3>
            <p>Content you submit to the AI features is processed by our AI providers (DeepSeek/Google) solely for generating responses.</p>
        </section>
    </LegalLayout>
);

export const Terms = () => (
    <LegalLayout title="Terms of Service">
        <section>
            <h3 className="text-lg font-bold text-white mb-2">1. Acceptance of Terms</h3>
            <p>By using NexMap, you agree to these terms. If you do not agree, please do not use our service.</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">2. Service Usage</h3>
            <p>You agree to use NexMap for lawful purposes only. You must not use the service to generate harmful, illegal, or abusive content.</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">3. Intellectual Property</h3>
            <p>You retain rights to the content you create. The NexMap platform and its original content remain our property.</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">4. Disclaimer</h3>
            <p>The service is provided "as is" without warranties of any kind. AI-generated content may be inaccurate; please verify important information.</p>
        </section>
    </LegalLayout>
);
