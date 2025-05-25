import React, { useEffect, useRef, useState } from 'react';
import S1_Hero from './design-lab/sections/S1_Hero';
import S2_Problem from './design-lab/sections/S2_Problem';
import S3_Explosion from './design-lab/sections/S3_Explosion';
import S4_InfiniteCanvas from './design-lab/sections/S4_InfiniteCanvas';
import S5_NeuralCore from './design-lab/sections/S5_NeuralCore';
import S6_AutoSort from './design-lab/sections/S6_AutoSort';
import S7_Recursive from './design-lab/sections/S7_Recursive';
import S8_Performance from './design-lab/sections/S8_Performance';
import S9_Flow from './design-lab/sections/S9_Flow';
import S10_CTA from './design-lab/sections/S10_CTA';

const DesignLab = () => {
    return (
        <div className="bg-black text-white w-full overflow-x-hidden">
            <S1_Hero />
            <S2_Problem />
            <S3_Explosion />
            <S4_InfiniteCanvas />
            <S5_NeuralCore />
            <S6_AutoSort />
            <S7_Recursive />
            <S8_Performance />
            <S9_Flow />
            <S10_CTA />
        </div>
    );
};
export default DesignLab;
