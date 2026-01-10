// js/ai.js
import { formatKRW } from './utils.js';

export async function predictPrice(data) {
    const container = document.getElementById('aiPrediction');
    const text = document.getElementById('predictText');

    // Safety check for data sufficiency
    if (!container || !data || data.length < 30) {
        if (text) text.textContent = '데이터 부족 (최소 30일)';
        return;
    }

    text.textContent = 'AI 분석 중... 🤖';

    try {
        const prices = data.map(d => d.close).filter(p => p !== null && !isNaN(p));

        // Critical: Check if prices are valid and have variance
        if (prices.length < 30) throw new Error('Not enough valid prices');
        const min = Math.min(...prices);
        const max = Math.max(...prices);

        if (min === max) {
            text.innerHTML = '<span class="text-slate-400">변동성 부족으로 예측 불가</span>';
            return;
        }

        const normalized = prices.map(p => (p - min) / (max - min));
        const n = prices.length;
        const windowSize = 20;

        const xs = [];
        const ys = [];
        for (let i = 0; i < n - windowSize; i++) {
            xs.push(i);
            ys.push(normalized[i + windowSize]);
        }

        const tensorX = tf.tensor2d(xs, [xs.length, 1]);
        const tensorY = tf.tensor2d(ys, [ys.length, 1]);

        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

        await model.fit(tensorX, tensorY, { epochs: 50, verbose: 0 });

        const nextStep = tf.tensor2d([n - windowSize + 1], [1, 1]);
        const prediction = model.predict(nextStep);
        const predVal = prediction.dataSync()[0];

        // Inverse Normalization
        let predictedPrice = predVal * (max - min) + min;

        // Safety: Ensure predicted price is a valid number
        if (isNaN(predictedPrice) || !isFinite(predictedPrice)) {
            throw new Error('Prediction resulted in NaN');
        }

        const currentPrice = prices[n - 1];
        const diff = predictedPrice - currentPrice;
        const diffPercent = (diff / currentPrice) * 100;

        const sign = diff >= 0 ? '🔺' : '🔻';
        const color = diff >= 0 ? 'text-red-400' : 'text-blue-400';

        // Additional Safety for NaN in formatting
        const formattedPrice = formatKRW(predictedPrice);
        const formattedPercent = isNaN(diffPercent) ? '0.00' : diffPercent.toFixed(2);

        text.innerHTML = `<span class="${color} font-bold">${sign} ${formattedPrice}</span> (예상 등락: ${formattedPercent}%)`;

        tensorX.dispose();
        tensorY.dispose();
        nextStep.dispose();
        prediction.dispose();
    } catch (e) {
        console.error('TF Prediction Error:', e);
        text.textContent = '예측 실패 (데이터 오류)';
    }
}
