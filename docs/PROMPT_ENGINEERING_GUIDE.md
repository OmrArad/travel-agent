# Key Prompt Engineering Decisions

## Travel-Only Policy
- **Strict travel focus:** The assistant ONLY answers travel-related questions
- **Non-travel rejection:** Math, general knowledge, and other non-travel queries are politely declined
- **Travel keyword detection:** Automatic filtering of queries using comprehensive travel vocabulary

**Why this approach:** Ensures the assistant stays focused on its core purpose as a travel assistant and provides clear boundaries for users.

## Dual Prompt Strategy
- **Complex queries** (planning, budgets): Use chain-of-thought reasoning with structured analysis
- **Simple queries** (weather, tips): Use standard prompt for concise responses

**Why this approach:** Complex travel planning requires step-by-step reasoning to break down budgets, logistics, and trade-offs. Simple queries like weather don't need this depth and benefit from direct, concise responses.

## Response Structure
- **Consistent formatting:** Markdown with emojis for readability
- **Follow-up questions:** Include 1-2 natural follow-ups when they add value
- **Direct address:** Use "you" instead of "the user" for personal engagement
- **Subtle integration:** Embed questions naturally rather than using forced "What's Next?" sections

**Why these choices:** 
- **Emojis and formatting:** Makes responses scannable and visually appealing, especially for mobile users
- **Follow-up questions:** Provides helpful guidance without being repetitive or forced
- **Direct address:** Creates more personal, conversational experience compared to formal third-person responses
- **Natural flow:** Avoids repetitive "What's Next?" sections that can feel artificial

## Context Management
- **History limit:** 8 messages with smart cleanup
- **Duplicate detection:** 80% similarity threshold
- **Weather consolidation:** Automatic city-based deduplication
- **Travel filtering:** Automatic detection and rejection of non-travel queries

**Why these limits:** 
- **8 messages:** Balances context retention with processing efficiency and cost
- **80% similarity:** Prevents redundant processing while allowing slight variations in user questions
- **Weather consolidation:** Reduces API calls and improves performance for repeated weather queries
- **Travel filtering:** Ensures the assistant stays focused on travel topics and provides clear user guidance

## Model Settings Explained

### Temperature: 0.7
**What it means:** Controls how "creative" vs "focused" the AI responses are
- **Lower values (0.0-0.3):** Very focused, consistent, but repetitive
- **Higher values (0.8-1.0):** Very creative, but potentially inconsistent
- **0.7 chosen:** Balanced creativity for engaging travel advice while maintaining reliability

### Top_p: 0.9
**What it means:** Controls vocabulary diversity by limiting word choices to the most likely 90%
- **Lower values (0.5-0.7):** Very safe, common words, but potentially boring
- **Higher values (0.9-1.0):** More diverse vocabulary, but risk of unusual word choices
- **0.9 chosen:** Rich, varied language while staying within safe, understandable vocabulary

### Max Tokens: 4096
**What it means:** Maximum length of AI response (roughly 3000-4000 words)
- **Too low (1000-2000):** Responses cut off mid-sentence
- **Too high (8000+):** Unnecessarily long responses, higher costs
- **4096 chosen:** Allows comprehensive travel advice without excessive verbosity
