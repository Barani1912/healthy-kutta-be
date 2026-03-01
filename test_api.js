async function testNews() {
    try {
        console.log('--- Testing Nutrition News (Probing OpenRouter) ---');
        const response = await fetch('http://localhost:3001/api/ai/nutrition-news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testNews();
