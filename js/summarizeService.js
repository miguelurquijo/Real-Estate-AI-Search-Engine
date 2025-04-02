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
                Authorization: `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`,
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