// summarizeService.js

export async function summarizeInput(userInput, promptFilePath) {
    try {
        const promptResponse = await fetch(promptFilePath);
        if (!promptResponse.ok) throw new Error("Failed to load initial prompt.");
        const initialPrompt = await promptResponse.text();

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `sk-proj-lxxxxx`,
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: initialPrompt },
                    {
                        role: "user",
                        content: `Please summarize the following text: "${userInput}"`,
                    },
                ],
                max_tokens: 500,
                temperature: 0.5,
            }),
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "No summary available.";
    } catch (error) {
        console.error("Error fetching summary:", error);
        return null;
    }
}