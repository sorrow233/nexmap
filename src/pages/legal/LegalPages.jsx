
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
                support.nexmap@catzz.work<br />
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
    <LegalLayout title="プライバシーポリシー">
        <section>
            <h3 className="text-lg font-bold text-white mb-2">1. 個人情報の収集</h3>
            <p>当サービスは、ユーザー認証のためにGoogle Firebaseを使用し、メールアドレス等の情報を収集します。クレジットカード情報はStripeによって安全に処理され、当サービスでは保存しません。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">2. 個人情報の利用目的</h3>
            <p>収集した個人情報は、サービスの提供、運営、改善のためにのみ利用されます。法令に基づく場合を除き、第三者に個人情報を提供することはありません。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">3. データの安全性</h3>
            <p>当サービスは、個人情報の漏洩、滅失、毀損の防止その他個人情報の安全管理のために必要かつ適切な措置を講じます。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">4. AIによるデータ処理</h3>
            <p>AI機能のために送信されたコンテンツは、応答生成の目的でのみAIプロバイダー（DeepSeek/Google）によって処理されます。これらのデータが学習に使用されることはありません。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">5. お問い合わせ</h3>
            <p>プライバシーポリシーに関するお問い合わせは、特定商取引法に基づく表記に記載のメールアドレスまでご連絡ください。</p>
        </section>
    </LegalLayout>
);

export const Terms = () => (
    <LegalLayout title="利用規約">
        <section>
            <h3 className="text-lg font-bold text-white mb-2">1. 規約への同意</h3>
            <p>本規約は、NexMap（以下「本サービス」）の利用条件を定めるものです。本サービスを利用することで、ユーザーは本規約に同意したものとみなされます。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">2. 禁止事項</h3>
            <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ul className="list-disc list-inside ml-4 mt-2 text-slate-400">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>本サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>他のユーザーに迷惑をかける行為</li>
                <li>有害、違法、または不適切なコンテンツを生成・共有する行為</li>
            </ul>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">3. 知的財産権</h3>
            <p>ユーザーが作成したコンテンツの著作権はユーザーに帰属します。ただし、本サービス自体のプログラム、デザイン、ロゴ等の知的財産権は運営者に帰属します。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">4. 免責事項</h3>
            <p>本サービスは「現状有姿」で提供されます。運営者は、本サービスに事実上または法律上の瑕疵がないことを保証しません。AIによって生成された情報の正確性、完全性について、運営者は一切の責任を負いません。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">5. サービス内容の変更等</h3>
            <p>運営者は、ユーザーに通知することなく、本サービスの内容を変更し、または提供を中止することができるものとします。</p>
        </section>
        <section>
            <h3 className="text-lg font-bold text-white mb-2">6. 準拠法・裁判管轄</h3>
            <p>本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、運営者の所在地を管轄する裁判所を専属的合意管轄とします。</p>
        </section>
    </LegalLayout>
);
