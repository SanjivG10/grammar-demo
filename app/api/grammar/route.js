
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('auth-session')?.value;
  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, message: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { text } = await request.json();
  if (!text || typeof text !== 'string') {
    return NextResponse.json(
      { success: false, message: 'Invalid text input' },
      { status: 400 }
    );
  }

    // Normalize text for consistent Unicode representation.
    const normalizedText = text.normalize('NFC');

    const delimiterStart = "[START:"; // Will append the token id and closing bracket.
    const delimiterEnd = "[END]";
  
    const regex = /(\S+|\s+)/g;
    const tokens = normalizedText.match(regex) || [];
  
    const tokenPositions = [];
    let currentPos = 0;
    const delimitedTokens = tokens.map((token, index) => {
      const tokenId = index + 1; // Unique ID per token.
      tokenPositions.push({
        id: tokenId,
        text: token,
        start: currentPos,
        end: currentPos + token.length,
      });
      currentPos += token.length;
      // Wrap each token with its unique id.
      return `${delimiterStart}${tokenId}]${token}${delimiterEnd}`;
    });
    const delimitedText = delimitedTokens.join('');
  
    const prompt = `
  I will give you a text with each token (word, punctuation, or whitespace) enclosed in delimiters in the following format:
  [START:<ID>]token[END]
  where <ID> is a unique identifier for that token.
  
  Analyze the text for grammatical errors. Return the EXACT same text but for tokens with errors, modify the opening delimiter to include error information in the format:
  [START:<ID>:ERROR:error_type:suggestion]
  For example:
  Input: "[START:1]This[END][START:2] is[END][START:3] a[END][START:4] mistake[END]"
  Output: "[START:1]This[END][START:2] is[END][START:3:ERROR:grammar:should be 'an'] a[END][START:4] mistake[END]"
  
  IMPORTANT:
  - Preserve all original delimiters and spacing exactly.
  - Only annotate non-whitespace tokens (do not annotate tokens that are purely whitespace).
  
  Text: "${delimitedText}"
    `;

    try {
      // Call the OpenAI API.
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o-mini", // Replace with your actual model if needed.
          messages: [
            { role: "system", content: "You are a grammar assistant." },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      const annotatedText = response.data.choices[0].message.content.trim();
  
      const tokenRegex = /\[START:(\d+)(?::ERROR:([^:]+):([^\]]+))?\](.*?)\[END\]/g;
      const annotatedTokens = [];
      let match;
      while ((match = tokenRegex.exec(annotatedText)) !== null) {
        annotatedTokens.push({
          id: parseInt(match[1], 10),
          errorType: match[2] || null,
          suggestion: match[3] || null,
          text: match[4],
        });
      }
  
      const errors = [];
      for (const annToken of annotatedTokens) {
        if (annToken.errorType) {
          const tokenPos = tokenPositions.find(tp => tp.id === annToken.id);
          if (tokenPos) {
            errors.push({
              error: annToken.errorType,
              suggestion: annToken.suggestion,
              text: annToken.text,
              start: tokenPos.start,
              end: tokenPos.end
            });
          }
        }
      }
  
      return NextResponse.json({
        success: true,
        errors,
        normalizedText,
      });
    } catch (error) {
      console.error("Error checking grammar:", error);
      return NextResponse.json({ success: false, message: "Error checking grammar" }, { status: 500 });
    }
  
}
