# Text generation

The Gemini API can generate text output from text, images, video, and audio
inputs.

Here's a basic example:

### Python

    from google import genai

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="How does AI work?"
    )
    print(response.text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "How does AI work?",
      });
      console.log(response.text);
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-3-flash-preview",
          genai.Text("Explain how AI works in a few words"),
          nil,
      )

      fmt.Println(result.Text())
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentResponse;

    public class GenerateContentWithTextInput {
      public static void main(String[] args) {

        Client client = new Client();

        GenerateContentResponse response =
            client.models.generateContent("gemini-3-flash-preview", "How does AI work?", null);

        System.out.println(response.text());
      }
    }

### REST

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "parts": [
              {
                "text": "How does AI work?"
              }
            ]
          }
        ]
      }'

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const payload = {
        contents: [
          {
            parts: [
              { text: 'How AI does work?' },
            ],
          },
        ],
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

## Thinking with Gemini

Gemini models often have ["thinking"](https://ai.google.dev/gemini-api/docs/thinking) enabled by default
which allows the model to reason before responding to a request.

Each model supports different thinking configurations which gives you control
over cost, latency, and intelligence. For more details, see the
[thinking guide](https://ai.google.dev/gemini-api/docs/thinking#set-budget).

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="How does AI work?",
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="low")
        ),
    )
    print(response.text)

### JavaScript

    import { GoogleGenAI, ThinkingLevel } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "How does AI work?",
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        }
      });
      console.log(response.text);
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      thinkingLevelVal := "low"

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-3-flash-preview",
          genai.Text("How does AI work?"),
          &genai.GenerateContentConfig{
            ThinkingConfig: &genai.ThinkingConfig{
                ThinkingLevel: &thinkingLevelVal,
            },
          }
      )

      fmt.Println(result.Text())
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.ThinkingConfig;
    import com.google.genai.types.ThinkingLevel;

    public class GenerateContentWithThinkingConfig {
      public static void main(String[] args) {

        Client client = new Client();

        GenerateContentConfig config =
            GenerateContentConfig.builder()
                .thinkingConfig(ThinkingConfig.builder().thinkingLevel(new ThinkingLevel("low")))
                .build();

        GenerateContentResponse response =
            client.models.generateContent("gemini-3-flash-preview", "How does AI work?", config);

        System.out.println(response.text());
      }
    }

### REST

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "parts": [
              {
                "text": "How does AI work?"
              }
            ]
          }
        ],
        "generationConfig": {
          "thinkingConfig": {
            "thinkingLevel": "low"
          }
        }
      }'

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const payload = {
        contents: [
          {
            parts: [
              { text: 'How AI does work?' },
            ],
          },
        ],
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: 'low'
          }
        }
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

## System instructions and other configurations

You can guide the behavior of Gemini models with system instructions. To do so,
pass a [`GenerateContentConfig`](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig)
object.

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        config=types.GenerateContentConfig(
            system_instruction="You are a cat. Your name is Neko."),
        contents="Hello there"
    )

    print(response.text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Hello there",
        config: {
          systemInstruction: "You are a cat. Your name is Neko.",
        },
      });
      console.log(response.text);
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      config := &genai.GenerateContentConfig{
          SystemInstruction: genai.NewContentFromText("You are a cat. Your name is Neko.", genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-3-flash-preview",
          genai.Text("Hello there"),
          config,
      )

      fmt.Println(result.Text())
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    public class GenerateContentWithSystemInstruction {
      public static void main(String[] args) {

        Client client = new Client();

        GenerateContentConfig config =
            GenerateContentConfig.builder()
                .systemInstruction(
                    Content.fromParts(Part.fromText("You are a cat. Your name is Neko.")))
                .build();

        GenerateContentResponse response =
            client.models.generateContent("gemini-3-flash-preview", "Hello there", config);

        System.out.println(response.text());
      }
    }

### REST

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -d '{
        "system_instruction": {
          "parts": [
            {
              "text": "You are a cat. Your name is Neko."
            }
          ]
        },
        "contents": [
          {
            "parts": [
              {
                "text": "Hello there"
              }
            ]
          }
        ]
      }'

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const systemInstruction = {
        parts: [{
          text: 'You are a cat. Your name is Neko.'
        }]
      };

      const payload = {
        systemInstruction,
        contents: [
          {
            parts: [
              { text: 'Hello there' },
            ],
          },
        ],
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

The [`GenerateContentConfig`](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig)
object also lets you override default generation parameters, such as
[temperature](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig).

> [!NOTE]
> When using Gemini 3 models, we strongly recommend keeping the `temperature` at its default value of 1.0. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance, particularly in complex mathematical or reasoning tasks.

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=["Explain how AI works"],
        config=types.GenerateContentConfig(
            temperature=0.1
        )
    )
    print(response.text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Explain how AI works",
        config: {
          temperature: 0.1,
        },
      });
      console.log(response.text);
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      temp := float32(0.9)
      topP := float32(0.5)
      topK := float32(20.0)

      config := &genai.GenerateContentConfig{
        Temperature:       &temp,
        TopP:              &topP,
        TopK:              &topK,
        ResponseMIMEType:  "application/json",
      }

      result, _ := client.Models.GenerateContent(
        ctx,
        "gemini-3-flash-preview",
        genai.Text("What is the average size of a swallow?"),
        config,
      )

      fmt.Println(result.Text())
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.types.GenerateContentConfig;
    import com.google.genai.types.GenerateContentResponse;

    public class GenerateContentWithConfig {
      public static void main(String[] args) {

        Client client = new Client();

        GenerateContentConfig config = GenerateContentConfig.builder().temperature(0.1f).build();

        GenerateContentResponse response =
            client.models.generateContent("gemini-3-flash-preview", "Explain how AI works", config);

        System.out.println(response.text());
      }
    }

### REST

    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "parts": [
              {
                "text": "Explain how AI works"
              }
            ]
          }
        ],
        "generationConfig": {
          "stopSequences": [
            "Title"
          ],
          "temperature": 1.0,
          "topP": 0.8,
          "topK": 10
        }
      }'

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const generationConfig = {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        responseFormat: { text: { mimeType: "text/plain" } },
      };

      const payload = {
        generationConfig,
        contents: [
          {
            parts: [
              { text: 'Explain how AI works in a few words' },
            ],
          },
        ],
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

Refer to the [`GenerateContentConfig`](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig)
in our API reference for a complete list of configurable parameters and their
descriptions.

## Multimodal inputs

The Gemini API supports multimodal inputs, allowing you to combine text with
media files. The following example demonstrates providing an image:

### Python

    from PIL import Image
    from google import genai

    client = genai.Client()

    image = Image.open("/path/to/organ.png")
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[image, "Tell me about this instrument"]
    )
    print(response.text)

### JavaScript

    import {
      GoogleGenAI,
      createUserContent,
      createPartFromUri,
    } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const image = await ai.files.upload({
        file: "/path/to/organ.png",
      });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          createUserContent([
            "Tell me about this instrument",
            createPartFromUri(image.uri, image.mimeType),
          ]),
        ],
      });
      console.log(response.text);
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      imagePath := "/path/to/organ.jpg"
      imgData, _ := os.ReadFile(imagePath)

      parts := []*genai.Part{
          genai.NewPartFromText("Tell me about this instrument"),
          &genai.Part{
              InlineData: &genai.Blob{
                  MIMEType: "image/jpeg",
                  Data:     imgData,
              },
          },
      }

      contents := []*genai.Content{
          genai.NewContentFromParts(parts, genai.RoleUser),
      }

      result, _ := client.Models.GenerateContent(
          ctx,
          "gemini-3-flash-preview",
          contents,
          nil,
      )

      fmt.Println(result.Text())
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.Content;
    import com.google.genai.types.GenerateContentResponse;
    import com.google.genai.types.Part;

    public class GenerateContentWithMultiModalInputs {
      public static void main(String[] args) {

        Client client = new Client();

        Content content =
          Content.fromParts(
              Part.fromText("Tell me about this instrument"),
              Part.fromUri("/path/to/organ.jpg", "image/jpeg"));

        GenerateContentResponse response =
            client.models.generateContent("gemini-3-flash-preview", content, null);

        System.out.println(response.text());
      }
    }

### REST

    # Use a temporary file to hold the base64 encoded image data
    TEMP_B64=$(mktemp)
    trap 'rm -f "$TEMP_B64"' EXIT
    base64 $B64FLAGS $IMG_PATH > "$TEMP_B64"

    # Use a temporary file to hold the JSON payload
    TEMP_JSON=$(mktemp)
    trap 'rm -f "$TEMP_JSON"' EXIT

    cat > "$TEMP_JSON" << EOF
    {
      "contents": [
        {
          "parts": [
            {
              "text": "Tell me about this instrument"
            },
            {
              "inline_data": {
                "mime_type": "image/jpeg",
                "data": "$(cat "$TEMP_B64")"
              }
            }
          ]
        }
      ]
    }
    EOF

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d "@$TEMP_JSON"

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const imageUrl = 'http://image/url';
      const image = getImageData(imageUrl);
      const payload = {
        contents: [
          {
            parts: [
              { image },
              { text: 'Tell me about this instrument' },
            ],
          },
        ],
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

    function getImageData(url) {
      const blob = UrlFetchApp.fetch(url).getBlob();

      return {
        mimeType: blob.getContentType(),
        data: Utilities.base64Encode(blob.getBytes())
      };
    }

For alternative methods of providing images and more advanced image processing,
see our [image understanding guide](https://ai.google.dev/gemini-api/docs/image-understanding).
The API also supports [document](https://ai.google.dev/gemini-api/docs/document-processing), [video](https://ai.google.dev/gemini-api/docs/video-understanding), and [audio](https://ai.google.dev/gemini-api/docs/audio)
inputs and understanding.

## Streaming responses

By default, the model returns a response only after the entire generation
process is complete.

For more fluid interactions, use streaming to receive [`GenerateContentResponse`](https://ai.google.dev/api/generate-content#v1beta.GenerateContentResponse) instances incrementally
as they're generated.

### Python

    from google import genai

    client = genai.Client()

    response = client.models.generate_content_stream(
        model="gemini-3-flash-preview",
        contents=["Explain how AI works"]
    )
    for chunk in response:
        print(chunk.text, end="")

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const response = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: "Explain how AI works",
      });

      for await (const chunk of response) {
        console.log(chunk.text);
      }
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      stream := client.Models.GenerateContentStream(
          ctx,
          "gemini-3-flash-preview",
          genai.Text("Write a story about a magic backpack."),
          nil,
      )

      for chunk, _ := range stream {
          part := chunk.Candidates[0].Content.Parts[0]
          fmt.Print(part.Text)
      }
    }

### Java

    import com.google.genai.Client;
    import com.google.genai.ResponseStream;
    import com.google.genai.types.GenerateContentResponse;

    public class GenerateContentStream {
      public static void main(String[] args) {

        Client client = new Client();

        ResponseStream<GenerateContentResponse> responseStream =
          client.models.generateContentStream(
              "gemini-3-flash-preview", "Write a story about a magic backpack.", null);

        for (GenerateContentResponse res : responseStream) {
          System.out.print(res.text());
        }

        // To save resources and avoid connection leaks, it is recommended to close the response
        // stream after consumption (or using try block to get the response stream).
        responseStream.close();
      }
    }

### REST

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      --no-buffer \
      -d '{
        "contents": [
          {
            "parts": [
              {
                "text": "Explain how AI works"
              }
            ]
          }
        ]
      }'

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const payload = {
        contents: [
          {
            parts: [
              { text: 'Explain how AI works' },
            ],
          },
        ],
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

## Multi-turn conversations (chat)

Our SDKs provide functionality to collect multiple rounds of prompts and
responses into a chat, giving you an easy way to keep track of the conversation
history.

> [!NOTE]
> **Note:** Chat functionality is only implemented as part of the SDKs. Behind the scenes, it still uses the [`generateContent`](https://ai.google.dev/api/generate-content#method:-models.generatecontent) API. For multi-turn conversations, the full conversation history is sent to the model with each follow-up turn.

### Python

    from google import genai

    client = genai.Client()
    chat = client.chats.create(model="gemini-3-flash-preview")

    response = chat.send_message("I have 2 dogs in my house.")
    print(response.text)

    response = chat.send_message("How many paws are in my house?")
    print(response.text)

    for message in chat.get_history():
        print(f'role - {message.role}',end=": ")
        print(message.parts[0].text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        history: [
          {
            role: "user",
            parts: [{ text: "Hello" }],
          },
          {
            role: "model",
            parts: [{ text: "Great to meet you. What would you like to know?" }],
          },
        ],
      });

      const response1 = await chat.sendMessage({
        message: "I have 2 dogs in my house.",
      });
      console.log("Chat response 1:", response1.text);

      const response2 = await chat.sendMessage({
        message: "How many paws are in my house?",
      });
      console.log("Chat response 2:", response2.text);
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      history := []*genai.Content{
          genai.NewContentFromText("Hi nice to meet you! I have 2 dogs in my house.", genai.RoleUser),
          genai.NewContentFromText("Great to meet you. What would you like to know?", genai.RoleModel),
      }

      chat, _ := client.Chats.Create(ctx, "gemini-3-flash-preview", nil, history)
      res, _ := chat.SendMessage(ctx, genai.Part{Text: "How many paws are in my house?"})

      if len(res.Candidates) > 0 {
          fmt.Println(res.Candidates[0].Content.Parts[0].Text)
      }
    }

### Java

    import com.google.genai.Chat;
    import com.google.genai.Client;
    import com.google.genai.types.Content;
    import com.google.genai.types.GenerateContentResponse;

    public class MultiTurnConversation {
      public static void main(String[] args) {

        Client client = new Client();
        Chat chatSession = client.chats.create("gemini-3-flash-preview");

        GenerateContentResponse response =
            chatSession.sendMessage("I have 2 dogs in my house.");
        System.out.println("First response: " + response.text());

        response = chatSession.sendMessage("How many paws are in my house?");
        System.out.println("Second response: " + response.text());

        // Get the history of the chat session.
        // Passing 'true' to getHistory() returns the curated history, which excludes
        // empty or invalid parts.
        // Passing 'false' here would return the comprehensive history, including
        // empty or invalid parts.
        ImmutableList<Content> history = chatSession.getHistory(true);
        System.out.println("History: " + history);
      }
    }

### REST

    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "role": "user",
            "parts": [
              {
                "text": "Hello"
              }
            ]
          },
          {
            "role": "model",
            "parts": [
              {
                "text": "Great to meet you. What would you like to know?"
              }
            ]
          },
          {
            "role": "user",
            "parts": [
              {
                "text": "I have two dogs in my house. How many paws are in my house?"
              }
            ]
          }
        ]
      }'

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Hello' },
            ],
          },
          {
            role: 'model',
            parts: [
              { text: 'Great to meet you. What would you like to know?' },
            ],
          },
          {
            role: 'user',
            parts: [
              { text: 'I have two dogs in my house. How many paws are in my house?' },
            ],
          },
        ],
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

Streaming can also be used for multi-turn conversations.

### Python

    from google import genai

    client = genai.Client()
    chat = client.chats.create(model="gemini-3-flash-preview")

    response = chat.send_message_stream("I have 2 dogs in my house.")
    for chunk in response:
        print(chunk.text, end="")

    response = chat.send_message_stream("How many paws are in my house?")
    for chunk in response:
        print(chunk.text, end="")

    for message in chat.get_history():
        print(f'role - {message.role}', end=": ")
        print(message.parts[0].text)

### JavaScript

    import { GoogleGenAI } from "@google/genai";

    const ai = new GoogleGenAI({});

    async function main() {
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        history: [
          {
            role: "user",
            parts: [{ text: "Hello" }],
          },
          {
            role: "model",
            parts: [{ text: "Great to meet you. What would you like to know?" }],
          },
        ],
      });

      const stream1 = await chat.sendMessageStream({
        message: "I have 2 dogs in my house.",
      });
      for await (const chunk of stream1) {
        console.log(chunk.text);
        console.log("_".repeat(80));
      }

      const stream2 = await chat.sendMessageStream({
        message: "How many paws are in my house?",
      });
      for await (const chunk of stream2) {
        console.log(chunk.text);
        console.log("_".repeat(80));
      }
    }

    await main();

### Go

    package main

    import (
      "context"
      "fmt"
      "os"
      "google.golang.org/genai"
    )

    func main() {

      ctx := context.Background()
      client, err := genai.NewClient(ctx, nil)
      if err != nil {
          log.Fatal(err)
      }

      history := []*genai.Content{
          genai.NewContentFromText("Hi nice to meet you! I have 2 dogs in my house.", genai.RoleUser),
          genai.NewContentFromText("Great to meet you. What would you like to know?", genai.RoleModel),
      }

      chat, _ := client.Chats.Create(ctx, "gemini-3-flash-preview", nil, history)
      stream := chat.SendMessageStream(ctx, genai.Part{Text: "How many paws are in my house?"})

      for chunk, _ := range stream {
          part := chunk.Candidates[0].Content.Parts[0]
          fmt.Print(part.Text)
      }
    }

### Java

    import com.google.genai.Chat;
    import com.google.genai.Client;
    import com.google.genai.ResponseStream;
    import com.google.genai.types.GenerateContentResponse;

    public class MultiTurnConversationWithStreaming {
      public static void main(String[] args) {

        Client client = new Client();
        Chat chatSession = client.chats.create("gemini-3-flash-preview");

        ResponseStream<GenerateContentResponse> responseStream =
            chatSession.sendMessageStream("I have 2 dogs in my house.", null);

        for (GenerateContentResponse response : responseStream) {
          System.out.print(response.text());
        }

        responseStream = chatSession.sendMessageStream("How many paws are in my house?", null);

        for (GenerateContentResponse response : responseStream) {
          System.out.print(response.text());
        }

        // Get the history of the chat session. History is added after the stream
        // is consumed and includes the aggregated response from the stream.
        System.out.println("History: " + chatSession.getHistory(false));
      }
    }

### REST

    curl https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "role": "user",
            "parts": [
              {
                "text": "Hello"
              }
            ]
          },
          {
            "role": "model",
            "parts": [
              {
                "text": "Great to meet you. What would you like to know?"
              }
            ]
          },
          {
            "role": "user",
            "parts": [
              {
                "text": "I have two dogs in my house. How many paws are in my house?"
              }
            ]
          }
        ]
      }'

### Apps Script

    // See https://developers.google.com/apps-script/guides/properties
    // for instructions on how to set the API key.
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

    function main() {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Hello' },
            ],
          },
          {
            role: 'model',
            parts: [
              { text: 'Great to meet you. What would you like to know?' },
            ],
          },
          {
            role: 'user',
            parts: [
              { text: 'I have two dogs in my house. How many paws are in my house?' },
            ],
          },
        ],
      };

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent';
      const options = {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey,
        },
        payload: JSON.stringify(payload)
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response);
      const content = data['candidates'][0]['content']['parts'][0]['text'];
      console.log(content);
    }

## Prompting tips

Consult our [prompt engineering guide](https://ai.google.dev/gemini/docs/prompting-strategies) for
suggestions on getting the most out of Gemini.

## What's next

- Try [Gemini in Google AI Studio](https://aistudio.google.com).
- Experiment with [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) for JSON-like responses.
- Explore Gemini's [image](https://ai.google.dev/gemini-api/docs/image-understanding), [video](https://ai.google.dev/gemini-api/docs/video-understanding), [audio](https://ai.google.dev/gemini-api/docs/audio) and [document](https://ai.google.dev/gemini-api/docs/document-processing) understanding capabilities.
- Learn about multimodal [file prompting strategies](https://ai.google.dev/gemini-api/docs/files#prompt-guide).












# Function calling with the Gemini API

Function calling lets you connect models to external tools and APIs.
Instead of generating text responses, the model determines when to call specific
functions and provides the necessary parameters to execute real-world actions.
This allows the model to act as a bridge between natural language and real-world
actions and data. Function calling has 3 primary use cases:

- **Augment Knowledge:** Access information from external sources like databases, APIs, and knowledge bases.
- **Extend Capabilities:** Use external tools to perform computations and extend the limitations of the model, such as using a calculator or creating charts.
- **Take Actions:** Interact with external systems using APIs, such as scheduling appointments, creating invoices, sending emails, or controlling smart home devices.

> [!NOTE]
> **Important:** Gemini 3 model APIs now generate a unique `id` for every function call. If you are manually constructing the conversation history or using the REST API, when returning the result of your executed function to the model we recommend passing the matching `id` in your `functionResponse`. If you are using the standard Python or Node.js SDKs, this is handled automatically.

<button value="weather">Get Weather</button> <button value="meeting" default="">Schedule Meeting</button> <button value="chart">Create Chart</button>

### Python

    from google import genai
    from google.genai import types

    # Define the function declaration for the model
    schedule_meeting_function = {
        "name": "schedule_meeting",
        "description": "Schedules a meeting with specified attendees at a given time and date.",
        "parameters": {
            "type": "object",
            "properties": {
                "attendees": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of people attending the meeting.",
                },
                "date": {
                    "type": "string",
                    "description": "Date of the meeting (e.g., '2024-07-29')",
                },
                "time": {
                    "type": "string",
                    "description": "Time of the meeting (e.g., '15:00')",
                },
                "topic": {
                    "type": "string",
                    "description": "The subject or topic of the meeting.",
                },
            },
            "required": ["attendees", "date", "time", "topic"],
        },
    }

    # Configure the client and tools
    client = genai.Client()
    tools = types.Tool(function_declarations=[schedule_meeting_function])
    config = types.GenerateContentConfig(tools=[tools])

    # Send request with function declarations
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="Schedule a meeting with Bob and Alice for 03/14/2025 at 10:00 AM about the Q3 planning.",
        config=config,
    )

    # Check for a function call
    if response.candidates[0].content.parts[0].function_call:
        function_call = response.candidates[0].content.parts[0].function_call
        print(f"Function to call: {function_call.name}")
        print(f"ID: {function_call.id}")
        print(f"Arguments: {function_call.args}")
        #  In a real app, you would call your function here:
        #  result = schedule_meeting(**function_call.args)
    else:
        print("No function call found in the response.")
        print(response.text)

### JavaScript

    import { GoogleGenAI, Type } from '@google/genai';

    // Configure the client
    const ai = new GoogleGenAI({});

    // Define the function declaration for the model
    const scheduleMeetingFunctionDeclaration = {
      name: 'schedule_meeting',
      description: 'Schedules a meeting with specified attendees at a given time and date.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          attendees: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of people attending the meeting.',
          },
          date: {
            type: Type.STRING,
            description: 'Date of the meeting (e.g., "2024-07-29")',
          },
          time: {
            type: Type.STRING,
            description: 'Time of the meeting (e.g., "15:00")',
          },
          topic: {
            type: Type.STRING,
            description: 'The subject or topic of the meeting.',
          },
        },
        required: ['attendees', 'date', 'time', 'topic'],
      },
    };

    // Send request with function declarations
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Schedule a meeting with Bob and Alice for 03/27/2025 at 10:00 AM about the Q3 planning.',
      config: {
        tools: [{
          functionDeclarations: [scheduleMeetingFunctionDeclaration]
        }],
      },
    });

    // Check for function calls in the response
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0]; // Assuming one function call
      console.log(`Function to call: ${functionCall.name}`);
      console.log(`ID: ${functionCall.id}`);
      console.log(`Arguments: ${JSON.stringify(functionCall.args)}`);
      // In a real app, you would call your actual function here:
      // const result = await scheduleMeeting(functionCall.args);
    } else {
      console.log("No function call found in the response.");
      console.log(response.text);
    }

### REST

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          {
            "role": "user",
            "parts": [
              {
                "text": "Schedule a meeting with Bob and Alice for 03/27/2025 at 10:00 AM about the Q3 planning."
              }
            ]
          }
        ],
        "tools": [
          {
            "functionDeclarations": [
              {
                "name": "schedule_meeting",
                "description": "Schedules a meeting with specified attendees at a given time and date.",
                "parameters": {
                  "type": "object",
                  "properties": {
                    "attendees": {
                      "type": "array",
                      "items": {"type": "string"},
                      "description": "List of people attending the meeting."
                    },
                    "date": {
                      "type": "string",
                      "description": "Date of the meeting (e.g., '2024-07-29')"
                    },
                    "time": {
                      "type": "string",
                      "description": "Time of the meeting (e.g., '15:00')"
                    },
                    "topic": {
                      "type": "string",
                      "description": "The subject or topic of the meeting."
                    }
                  },
                  "required": ["attendees", "date", "time", "topic"]
                }
              }
            ]
          }
        ]
      }'

## How function calling works

![function calling
overview](https://ai.google.dev/static/gemini-api/docs/images/function-calling-overview.png)

Function calling involves a structured interaction between your application, the
model, and external functions. Here's a breakdown of the process:

1. **Define function declaration:** Define the function declaration in your application code. Function Declarations describe the function's name, parameters, and purpose to the model.
2. **Call API with function declarations:** Send user prompt along with the function declaration(s) to the model. It analyzes the request and determines if a function call would be helpful. If so, it responds with a structured JSON object containing the function name, arguments, and a unique `id` (this `id` is now always returned by the API for Gemini 3 models^\*^).
3. **Execute function code (your responsibility):** The Model *doesn't* execute the function itself. It's your application's responsibility to process the response and check for a function call. If
   - **Yes** : Extract the name, args, and `id` of the function and execute the corresponding function in your application.
   - **No:** The model has provided a direct text response to the prompt (this flow is less emphasized in the example but is a possible outcome).
4. **Create user friendly response:** If a function was executed, capture the result and send it back to the model, ensuring you include the matching `id`, in a subsequent turn of the conversation. It will use the result to generate a final, user-friendly response that incorporates the information from the function call.

This process can be repeated over multiple turns, allowing for complex
interactions and workflows. The model also supports calling multiple functions
in a single turn ([parallel function calling](https://ai.google.dev/gemini-api/docs/function-calling#parallel_function_calling)), in
sequence ([compositional function calling](https://ai.google.dev/gemini-api/docs/function-calling#compositional_function_calling)),
and with built-in Gemini tools ([multi-tool use](https://ai.google.dev/gemini-api/docs/function-calling#native-tools)).

^\*^ **Always map function IDs:** Gemini 3 now always returns a unique
`id` with every `functionCall`. Include this exact `id` in your
`functionResponse` so the model can accurately map your result back to the
original request.

### Step 1: Define a function declaration

Define a function and its declaration within your application code that allows
users to set light values and make an API request. This function could call
external services or APIs.

### Python

    # Define a function that the model can call to control smart lights
    set_light_values_declaration = {
        "name": "set_light_values",
        "description": "Sets the brightness and color temperature of a light.",
        "parameters": {
            "type": "object",
            "properties": {
                "brightness": {
                    "type": "integer",
                    "description": "Light level from 0 to 100. Zero is off and 100 is full brightness",
                },
                "color_temp": {
                    "type": "string",
                    "enum": ["daylight", "cool", "warm"],
                    "description": "Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.",
                },
            },
            "required": ["brightness", "color_temp"],
        },
    }

    # This is the actual function that would be called based on the model's suggestion
    def set_light_values(brightness: int, color_temp: str) -> dict[str, int | str]:
        """Set the brightness and color temperature of a room light. (mock API).

        Args:
            brightness: Light level from 0 to 100. Zero is off and 100 is full brightness
            color_temp: Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.

        Returns:
            A dictionary containing the set brightness and color temperature.
        """
        return {"brightness": brightness, "colorTemperature": color_temp}

### JavaScript

    import { Type } from '@google/genai';

    // Define a function that the model can call to control smart lights
    const setLightValuesFunctionDeclaration = {
      name: 'set_light_values',
      description: 'Sets the brightness and color temperature of a light.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          brightness: {
            type: Type.NUMBER,
            description: 'Light level from 0 to 100. Zero is off and 100 is full brightness',
          },
          color_temp: {
            type: Type.STRING,
            enum: ['daylight', 'cool', 'warm'],
            description: 'Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.',
          },
        },
        required: ['brightness', 'color_temp'],
      },
    };

    /**

    *   Set the brightness and color temperature of a room light. (mock API)
    *   @param {number} brightness - Light level from 0 to 100. Zero is off and 100 is full brightness
    *   @param {string} color_temp - Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.
    *   @return {Object} A dictionary containing the set brightness and color temperature.
    */
    function setLightValues(brightness, color_temp) {
      return {
        brightness: brightness,
        colorTemperature: color_temp
      };
    }

### Step 2: Call the model with function declarations

Once you have defined your function declarations, you can prompt the model to
use them. It analyzes the prompt and function declarations and decides whether
to respond directly or to call a function. If a function is called, the response
object will contain a function call suggestion.

### Python

    from google.genai import types

    # Configure the client and tools
    client = genai.Client()
    tools = types.Tool(function_declarations=[set_light_values_declaration])
    config = types.GenerateContentConfig(tools=[tools])

    # Define user prompt
    contents = [
        types.Content(
            role="user", parts=[types.Part(text="Turn the lights down to a romantic level")]
        )
    ]

    # Send request with function declarations
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=contents,
        config=config,
    )

    print(response.candidates[0].content.parts[0].function_call)

### JavaScript

    import { GoogleGenAI } from '@google/genai';

    // Generation config with function declaration
    const config = {
      tools: [{
        functionDeclarations: [setLightValuesFunctionDeclaration]
      }]
    };

    // Configure the client
    const ai = new GoogleGenAI({});

    // Define user prompt
    const contents = [
      {
        role: 'user',
        parts: [{ text: 'Turn the lights down to a romantic level' }]
      }
    ];

    // Send request with function declarations
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: config
    });

    console.log(response.functionCalls[0]);

The model then returns a `functionCall` object in an OpenAPI compatible
schema specifying how to call one or more of the declared functions in order to
respond to the user's question.

### Python

    id='8f2b1a3c' args={'color_temp': 'warm', 'brightness': 25} name='set_light_values'

### JavaScript

    {
      id: '8f2b1a3c',
      name: 'set_light_values',
      args: { brightness: 25, color_temp: 'warm' }
    }

### Step 3: Execute set_light_values function code

Extract the function call details from the model's response, parse the arguments
, and execute the `set_light_values` function.

### Python

    # Extract tool call details, it may not be in the first part.
    tool_call = response.candidates[0].content.parts[0].function_call

    if tool_call.name == "set_light_values":
        result = set_light_values(**tool_call.args)
        print(f"Function execution result: {result}")

### JavaScript

    // Extract tool call details
    const tool_call = response.functionCalls[0]

    let result;
    if (tool_call.name === 'set_light_values') {
      result = setLightValues(tool_call.args.brightness, tool_call.args.color_temp);
      console.log(`Function execution result: ${JSON.stringify(result)}`);
    }

### Step 4: Create user friendly response with function result and call the model again

Finally, send the result of the function execution back to the model so it can
incorporate this information into its final response to the user.

### Python

    from google import genai
    from google.genai import types

    # Create a function response part
    function_response_part = types.Part.from_function_response(
        name=tool_call.name,
        response={"result": result},
        id=tool_call.id,
    )

    # Append function call and result of the function execution to contents
    contents.append(response.candidates[0].content) # Append the content from the model's response.
    contents.append(types.Content(role="user", parts=[function_response_part])) # Append the function response

    client = genai.Client()
    final_response = client.models.generate_content(
        model="gemini-3-flash-preview",
        config=config,
        contents=contents,
    )

    print(final_response.text)

### JavaScript

    // Create a function response part
    const function_response_part = {
      name: tool_call.name,
      response: { result },
      id: tool_call.id
    }

    // Append function call and result of the function execution to contents
    contents.push(response.candidates[0].content);
    contents.push({ role: 'user', parts: [{ functionResponse: function_response_part }] });

    // Get the final response from the model
    const final_response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: config
    });

    console.log(final_response.text);

This completes the function calling flow. The model successfully used the
`set_light_values` function to perform the request action of the user.

## Function declarations

When you implement function calling in a prompt, you create a `tools` object,
which contains one or more `function declarations`. You define functions using
JSON, specifically with a [select subset](https://ai.google.dev/api/caching#Schema)
of the [OpenAPI schema](https://spec.openapis.org/oas/v3.0.3#schemaw) format. A
single function declaration can include the following parameters:

- `name` (string): A unique name for the function (`get_weather_forecast`, `send_email`). Use descriptive names without spaces or special characters (use underscores or camelCase).
- `description` (string): A clear and detailed explanation of the function's purpose and capabilities. This is crucial for the model to understand when to use the function. Be specific and provide examples if helpful ("Finds theaters based on location and optionally movie title which is currently playing in theaters.").
- `parameters` (object): Defines the input parameters the function expects.
  - `type` (string): Specifies the overall data type, such as `object`.
  - `properties` (object): Lists individual parameters, each with:
    - `type` (string): The data type of the parameter, such as `string`, `integer`, `boolean, array`.
    - `description` (string): A description of the parameter's purpose and format. Provide examples and constraints ("The city and state, e.g., 'San Francisco, CA' or a zip code e.g., '95616'.").
    - `enum` (array, optional): If the parameter values are from a fixed set, use "enum" to list the allowed values instead of just describing them in the description. This improves accuracy ("enum": \["daylight", "cool", "warm"\]).
  - `required` (array): An array of strings listing the parameter names that are mandatory for the function to operate.

You can also construct `FunctionDeclarations` from Python functions directly using
`types.FunctionDeclaration.from_callable(client=client, callable=your_function)`.

## Function calling with thinking models

Gemini 3 and 2.5 series models use an internal ["thinking"](https://ai.google.dev/gemini-api/docs/thinking) process to reason through requests. This
significantly improves function calling performance,
allowing the model to better determine when to call a function and which
parameters to use. Because the Gemini API is stateless, models use
[thought signatures](https://ai.google.dev/gemini-api/docs/thought-signatures) to maintain context
across multi-turn conversations.

This section covers advanced management of thought signatures and is only
necessary if you're manually constructing API requests (e.g., via REST) or
manipulating conversation history.

**If you're using the [Google GenAI SDKs](https://ai.google.dev/gemini-api/docs/libraries) (our
official libraries), you don't need to manage this process** . The SDKs
automatically handle the necessary steps, as shown in the earlier
[example](https://ai.google.dev/gemini-api/docs/function-calling#step-4).

### Managing conversation history manually

If you modify the conversation history manually, instead of sending the
[complete previous response](https://ai.google.dev/gemini-api/docs/function-calling#step-4) you
must correctly handle the `thought_signature` included in the model's turn.

Follow these rules to ensure the model's context is preserved:

- Always send the `thought_signature` back to the model inside its original [`Part`](https://ai.google.dev/api#request-body-structure).
- **Always include the exact `id` from the `function_call` in your
  `function_response` so the API can map the result to the correct request.**
- Don't merge a `Part` containing a signature with one that does not. This breaks the positional context of the thought.
- Don't combine two `Parts` that both contain signatures, as the signature strings cannot be merged.

#### Gemini 3 thought signatures

In Gemini 3, any [`Part`](https://ai.google.dev/api#request-body-structure) of a model response
may contain a thought signature.
While we generally recommend returning signatures from all `Part` types,
passing back thought signatures is mandatory for function calling. Unless you
are manipulating conversation history manually, the Google GenAI SDK will
handle thought signatures automatically.

If you are manipulating conversation history manually, refer to the
[Thoughts Signatures](https://ai.google.dev/gemini-api/docs/thought-signatures) page for complete
guidance and details on handling thought signatures for Gemini 3.

##### Inspecting thought signatures

While not necessary for implementation, you can inspect the response to see the
`thought_signature` for debugging or educational purposes.

### Python

    import base64
    # After receiving a response from a model with thinking enabled
    # response = client.models.generate_content(...)

    # The signature is attached to the response part containing the function call
    part = response.candidates[0].content.parts[0]
    if part.thought_signature:
      print(base64.b64encode(part.thought_signature).decode("utf-8"))

### JavaScript

    // After receiving a response from a model with thinking enabled
    // const response = await ai.models.generateContent(...)

    // The signature is attached to the response part containing the function call
    const part = response.candidates[0].content.parts[0];
    if (part.thoughtSignature) {
      console.log(part.thoughtSignature);
    }

Learn more about limitations and usage of thought signatures, and about thinking
models in general, on the [Thinking](https://ai.google.dev/gemini-api/docs/thinking#signatures) page.

## Parallel function calling

In addition to single turn function calling, you can also call multiple
functions at once. Parallel function calling lets you execute multiple functions
at once and is used when the functions are not dependent on each other. This is
useful in scenarios like gathering data from multiple independent sources, such
as retrieving customer details from different databases or checking inventory
levels across various warehouses or performing multiple actions such as
converting your apartment into a disco.

When the model initiates multiple function calls in a single turn, you don't
need to return the `function_result` objects in the same order that the
`function_call` objects were received. The Gemini API maps each result back to
its corresponding call using the `id` from the model's output. This lets you
execute your functions asynchronously and append the results to your list as
they complete.

### Python

    power_disco_ball = {
        "name": "power_disco_ball",
        "description": "Powers the spinning disco ball.",
        "parameters": {
            "type": "object",
            "properties": {
                "power": {
                    "type": "boolean",
                    "description": "Whether to turn the disco ball on or off.",
                }
            },
            "required": ["power"],
        },
    }

    start_music = {
        "name": "start_music",
        "description": "Play some music matching the specified parameters.",
        "parameters": {
            "type": "object",
            "properties": {
                "energetic": {
                    "type": "boolean",
                    "description": "Whether the music is energetic or not.",
                },
                "loud": {
                    "type": "boolean",
                    "description": "Whether the music is loud or not.",
                },
            },
            "required": ["energetic", "loud"],
        },
    }

    dim_lights = {
        "name": "dim_lights",
        "description": "Dim the lights.",
        "parameters": {
            "type": "object",
            "properties": {
                "brightness": {
                    "type": "number",
                    "description": "The brightness of the lights, 0.0 is off, 1.0 is full.",
                }
            },
            "required": ["brightness"],
        },
    }

### JavaScript

    import { Type } from '@google/genai';

    const powerDiscoBall = {
      name: 'power_disco_ball',
      description: 'Powers the spinning disco ball.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          power: {
            type: Type.BOOLEAN,
            description: 'Whether to turn the disco ball on or off.'
          }
        },
        required: ['power']
      }
    };

    const startMusic = {
      name: 'start_music',
      description: 'Play some music matching the specified parameters.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          energetic: {
            type: Type.BOOLEAN,
            description: 'Whether the music is energetic or not.'
          },
          loud: {
            type: Type.BOOLEAN,
            description: 'Whether the music is loud or not.'
          }
        },
        required: ['energetic', 'loud']
      }
    };

    const dimLights = {
      name: 'dim_lights',
      description: 'Dim the lights.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          brightness: {
            type: Type.NUMBER,
            description: 'The brightness of the lights, 0.0 is off, 1.0 is full.'
          }
        },
        required: ['brightness']
      }
    };

Configure the function calling mode to allow using all of the specified tools.
To learn more, you can read about
[configuring function calling](https://ai.google.dev/gemini-api/docs/function-calling#function_calling_modes).

### Python

    from google import genai
    from google.genai import types

    # Configure the client and tools
    client = genai.Client()
    house_tools = [
        types.Tool(function_declarations=[power_disco_ball, start_music, dim_lights])
    ]
    config = types.GenerateContentConfig(
        tools=house_tools,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(
            disable=True
        ),
        # Force the model to call 'any' function, instead of chatting.
        tool_config=types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode='ANY')
        ),
    )

    chat = client.chats.create(model="gemini-3-flash-preview", config=config)
    response = chat.send_message("Turn this place into a party!")

    # Print out each of the function calls requested from this single call
    print("Example 1: Forced function calling")
    for fn in response.function_calls:
        args = ", ".join(f"{key}={val}" for key, val in fn.args.items())
        print(f"{fn.name}({args}) - ID: {fn.id}")

### JavaScript

    import { GoogleGenAI } from '@google/genai';

    // Set up function declarations
    const houseFns = [powerDiscoBall, startMusic, dimLights];

    const config = {
        tools: [{
            functionDeclarations: houseFns
        }],
        // Force the model to call 'any' function, instead of chatting.
        toolConfig: {
            functionCallingConfig: {
                mode: 'any'
            }
        }
    };

    // Configure the client
    const ai = new GoogleGenAI({});

    // Create a chat session
    const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: config
    });
    const response = await chat.sendMessage({message: 'Turn this place into a party!'});

    // Print out each of the function calls requested from this single call
    console.log("Example 1: Forced function calling");
    for (const fn of response.functionCalls) {
        const args = Object.entries(fn.args)
            .map(([key, val]) => `${key}=${val}`)
            .join(', ');
        console.log(`${fn.name}(${args}) - ID: ${fn.id}`);
    }

Each of the printed results reflects a single function call that the model has
requested. To send the results back, include the responses in the same order as
they were requested.

The Python SDK supports [automatic function calling](https://ai.google.dev/gemini-api/docs/function-calling#automatic_function_calling_python_only),
which automatically converts Python functions to declarations, handles the
function call execution and response cycle for you. Following is an example for
the disco use case.

> [!NOTE]
> **Note:** Automatic Function Calling is a Python SDK only feature at the moment.

### Python

    from google import genai
    from google.genai import types

    # Actual function implementations
    def power_disco_ball_impl(power: bool) -> dict:
        """Powers the spinning disco ball.

        Args:
            power: Whether to turn the disco ball on or off.

        Returns:
            A status dictionary indicating the current state.
        """
        return {"status": f"Disco ball powered {'on' if power else 'off'}"}

    def start_music_impl(energetic: bool, loud: bool) -> dict:
        """Play some music matching the specified parameters.

        Args:
            energetic: Whether the music is energetic or not.
            loud: Whether the music is loud or not.

        Returns:
            A dictionary containing the music settings.
        """
        music_type = "energetic" if energetic else "chill"
        volume = "loud" if loud else "quiet"
        return {"music_type": music_type, "volume": volume}

    def dim_lights_impl(brightness: float) -> dict:
        """Dim the lights.

        Args:
            brightness: The brightness of the lights, 0.0 is off, 1.0 is full.

        Returns:
            A dictionary containing the new brightness setting.
        """
        return {"brightness": brightness}

    # Configure the client
    client = genai.Client()
    config = types.GenerateContentConfig(
        tools=[power_disco_ball_impl, start_music_impl, dim_lights_impl]
    )

    # Make the request
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="Do everything you need to this place into party!",
        config=config,
    )

    print("\nExample 2: Automatic function calling")
    print(response.text)
    # I've turned on the disco ball, started playing loud and energetic music, and dimmed the lights to 50% brightness. Let's get this party started!

## Compositional function calling

Compositional or sequential function calling allows Gemini to chain multiple
function calls together to fulfill a complex request. For example, to answer
"Get the temperature in my current location", the Gemini API might first invoke
a `get_current_location()` function followed by a `get_weather()` function that
takes the location as a parameter.

The following example demonstrates how to implement compositional function
calling using the Python SDK and automatic function calling.

### Python

This example uses the automatic function calling feature of the
`google-genai` Python SDK. The SDK automatically converts the Python
functions to the required schema, executes the function calls when requested
by the model, and sends the results back to the model to complete the task.

    import os
    from google import genai
    from google.genai import types

    # Example Functions
    def get_weather_forecast(location: str) -> dict:
        """Gets the current weather temperature for a given location."""
        print(f"Tool Call: get_weather_forecast(location={location})")
        # TODO: Make API call
        print("Tool Response: {'temperature': 25, 'unit': 'celsius'}")
        return {"temperature": 25, "unit": "celsius"}  # Dummy response

    def set_thermostat_temperature(temperature: int) -> dict:
        """Sets the thermostat to a desired temperature."""
        print(f"Tool Call: set_thermostat_temperature(temperature={temperature})")
        # TODO: Interact with a thermostat API
        print("Tool Response: {'status': 'success'}")
        return {"status": "success"}

    # Configure the client and model
    client = genai.Client()
    config = types.GenerateContentConfig(
        tools=[get_weather_forecast, set_thermostat_temperature]
    )

    # Make the request
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="If it's warmer than 20°C in London, set the thermostat to 20°C, otherwise set it to 18°C.",
        config=config,
    )

    # Print the final, user-facing response
    print(response.text)

**Expected Output**

When you run the code, you will see the SDK orchestrating the function
calls. The model first calls `get_weather_forecast`, receives the
temperature, and then calls `set_thermostat_temperature` with the correct
value based on the logic in the prompt.

    Tool Call: get_weather_forecast(location=London)
    Tool Response: {'temperature': 25, 'unit': 'celsius'}
    Tool Call: set_thermostat_temperature(temperature=20)
    Tool Response: {'status': 'success'}
    OK. I've set the thermostat to 20°C.

### JavaScript

This example shows how to use JavaScript/TypeScript SDK to do comopositional
function calling using a manual execution loop.

    import { GoogleGenAI, Type } from "@google/genai";

    // Configure the client
    const ai = new GoogleGenAI({});

    // Example Functions
    function get_weather_forecast({ location }) {
      console.log(`Tool Call: get_weather_forecast(location=${location})`);
      // TODO: Make API call
      console.log("Tool Response: {'temperature': 25, 'unit': 'celsius'}");
      return { temperature: 25, unit: "celsius" };
    }

    function set_thermostat_temperature({ temperature }) {
      console.log(
        `Tool Call: set_thermostat_temperature(temperature=${temperature})`,
      );
      // TODO: Make API call
      console.log("Tool Response: {'status': 'success'}");
      return { status: "success" };
    }

    const toolFunctions = {
      get_weather_forecast,
      set_thermostat_temperature,
    };

    const tools = [
      {
        functionDeclarations: [
          {
            name: "get_weather_forecast",
            description:
              "Gets the current weather temperature for a given location.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                location: {
                  type: Type.STRING,
                },
              },
              required: ["location"],
            },
          },
          {
            name: "set_thermostat_temperature",
            description: "Sets the thermostat to a desired temperature.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                temperature: {
                  type: Type.NUMBER,
                },
              },
              required: ["temperature"],
            },
          },
        ],
      },
    ];

    // Prompt for the model
    let contents = [
      {
        role: "user",
        parts: [
          {
            text: "If it's warmer than 20°C in London, set the thermostat to 20°C, otherwise set it to 18°C.",
          },
        ],
      },
    ];

    // Loop until the model has no more function calls to make
    while (true) {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: { tools },
      });

      if (result.functionCalls && result.functionCalls.length > 0) {
        const functionCall = result.functionCalls[0];

        const { name, args } = functionCall;

        if (!toolFunctions[name]) {
          throw new Error(`Unknown function call: ${name}`);
        }

        // Call the function and get the response.
        const toolResponse = toolFunctions[name](args);

        const functionResponsePart = {
          name: functionCall.name,
          response: {
            result: toolResponse,
          },
          id: functionCall.id,
        };

        // Send the function response back to the model.
        contents.push({
          role: "model",
          parts: [
            {
              functionCall: functionCall,
            },
          ],
        });
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: functionResponsePart,
            },
          ],
        });
      } else {
        // No more function calls, break the loop.
        console.log(result.text);
        break;
      }
    }

**Expected Output**

When you run the code, you will see the SDK orchestrating the function
calls. The model first calls `get_weather_forecast`, receives the
temperature, and then calls `set_thermostat_temperature` with the correct
value based on the logic in the prompt.

    Tool Call: get_weather_forecast(location=London)
    Tool Response: {'temperature': 25, 'unit': 'celsius'}
    Tool Call: set_thermostat_temperature(temperature=20)
    Tool Response: {'status': 'success'}
    OK. It's 25°C in London, so I've set the thermostat to 20°C.

Compositional function calling is a native [Live
API](https://ai.google.dev/gemini-api/docs/live) feature. This means Live API
can handle the function calling similar to the Python SDK.

### Python

    # Light control schemas
    turn_on_the_lights_schema = {'name': 'turn_on_the_lights'}
    turn_off_the_lights_schema = {'name': 'turn_off_the_lights'}

    prompt = """
      Hey, can you write run some python code to turn on the lights, wait 10s and then turn off the lights?
      """

    tools = [
        {'code_execution': {}},
        {'function_declarations': [turn_on_the_lights_schema, turn_off_the_lights_schema]}
    ]

    await run(prompt, tools=tools, modality="AUDIO")

### JavaScript

    // Light control schemas
    const turnOnTheLightsSchema = { name: 'turn_on_the_lights' };
    const turnOffTheLightsSchema = { name: 'turn_off_the_lights' };

    const prompt = `
      Hey, can you write run some python code to turn on the lights, wait 10s and then turn off the lights?
    `;

    const tools = [
      { codeExecution: {} },
      { functionDeclarations: [turnOnTheLightsSchema, turnOffTheLightsSchema] }
    ];

    await run(prompt, tools=tools, modality="AUDIO")

## Function calling modes

The Gemini API lets you control how the model uses the provided tools
(function declarations). Specifically, you can set the mode within
the.`function_calling_config`.

- `VALIDATED`: Default mode for tool combination (when built-in tools or structured outputs also enabled). The model is constrained to predict either function calls or natural language, and ensures function schema adherence. If `allowed_function_names` is not provided, the model picks from all of the available function declarations. If `allowed_function_names` is provided, the model picks from the set of allowed functions. This mode reduces malformed function calls (compared to `AUTO` mode).
- `AUTO`: Default mode when only function_declarations tool enabled. The model decides whether to generate a natural language response or suggest a function call based on the prompt and context.
- `ANY`: The model is constrained to always predict a function call and ensures function schema adherence. If `allowed_function_names` is not specified, the model can choose from any of the provided function declarations. If `allowed_function_names` is provided as a list, the model can only choose from the functions in that list. Use this mode when you require a function call response to every prompt (if applicable).
- `NONE`: The model is *prohibited* from making function calls. This is
  equivalent to sending a request without any function declarations. Use this to
  temporarily disable function calling without removing your tool definitions.

### Python

    from google.genai import types

    # Configure function calling mode
    tool_config = types.ToolConfig(
        function_calling_config=types.FunctionCallingConfig(
            mode="ANY", allowed_function_names=["get_current_temperature"]
        )
    )

    # Create the generation config
    config = types.GenerateContentConfig(
        tools=[tools],  # not defined here.
        tool_config=tool_config,
    )

### JavaScript

    import { FunctionCallingConfigMode } from '@google/genai';

    // Configure function calling mode
    const toolConfig = {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: ['get_current_temperature']
      }
    };

    // Create the generation config
    const config = {
      tools: tools, // not defined here.
      toolConfig: toolConfig,
    };

## Automatic function calling (Python only)

When using the Python SDK, you can provide Python functions directly as tools.
The SDK converts these functions into declarations, manages the function call
execution, and handles the response cycle for you. Define your function with
type hints and a docstring. For optimal results, it is recommended to use
[Google-style docstrings.](https://google.github.io/styleguide/pyguide.html#383-functions-and-methods)
The SDK will then automatically:

1. Detect function call responses from the model.
2. Call the corresponding Python function in your code.
3. Send the function's response back to the model.
4. Return the model's final text response.

The SDK currently doesn't parse argument descriptions into the property
description slots of the generated function declaration. Instead, it sends the
entire docstring as the top-level function description.

### Python

    from google import genai
    from google.genai import types

    # Define the function with type hints and docstring
    def get_current_temperature(location: str) -> dict:
        """Gets the current temperature for a given location.

        Args:
            location: The city and state, e.g. San Francisco, CA

        Returns:
            A dictionary containing the temperature and unit.
        """
        # ... (implementation) ...
        return {"temperature": 25, "unit": "Celsius"}

    # Configure the client
    client = genai.Client()
    config = types.GenerateContentConfig(
        tools=[get_current_temperature]
    )  # Pass the function itself

    # Make the request
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="What's the temperature in Boston?",
        config=config,
    )

    print(response.text)  # The SDK handles the function call and returns the final text

You can disable automatic function calling with:

### Python

    config = types.GenerateContentConfig(
        tools=[get_current_temperature],
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
    )

### Automatic function schema declaration

The API is able to describe any of the following types. `Pydantic` types are
allowed, as long as the fields defined on them are also composed of allowed
types. Dict types (like `dict[str: int]`) are not well supported here, don't
use them.

### Python

    AllowedType = (
      int | float | bool | str | list['AllowedType'] | pydantic.BaseModel)

To see what the inferred schema looks like, you can convert it using
[`from_callable`](https://googleapis.github.io/python-genai/genai.html#genai.types.FunctionDeclaration.from_callable):

### Python

    from google import genai
    from google.genai import types

    def multiply(a: float, b: float):
        """Returns a * b."""
        return a * b

    client = genai.Client()
    fn_decl = types.FunctionDeclaration.from_callable(callable=multiply, client=client)

    # to_json_dict() provides a clean JSON representation.
    print(fn_decl.to_json_dict())

## Multi-tool use: Combine built-in tools with function calling

You can enable multiple tools, combining built-in tools with function calling in
the same request.

Gemini 3 models can combine built-in tools with function calling out-of-the-box,
thanks to the tool context circulation feature. Read the page on
[Combining built-in tools and function calling](https://ai.google.dev/gemini-api/docs/tool-combination) to learn more.

> [!WARNING]
> **Preview:** Combining built-in tools with function calling and tool context circulation features are in Preview in Gemini 3 models.

### Python

    from google import genai
    from google.genai import types

    client = genai.Client()

    getWeather = {
        "name": "getWeather",
        "description": "Gets the weather for a requested city.",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "The city and state, e.g. Utqiaġvik, Alaska",
                },
            },
            "required": ["city"],
        },
    }

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents="What is the northernmost city in the United States? What's the weather like there today?",
        config=types.GenerateContentConfig(
          tools=[
            types.Tool(
              google_search=types.ToolGoogleSearch(),  # Built-in tool
              function_declarations=[getWeather]       # Custom tool
            ),
          ],
          include_server_side_tool_invocations=True
        ),
    )

    history = [
        types.Content(
            role="user",
            parts=[types.Part(text="What is the northernmost city in the United States? What's the weather like there today?")]
        ),
        response.candidates[0].content,
        types.Content(
            role="user",
            parts=[types.Part(
                function_response=types.FunctionResponse(
                    name="getWeather",
                    response={"response": "Very cold. 22 degrees Fahrenheit."},
                    id=response.candidates[0].content.parts[2].function_call.id
                )
            )]
        )
    ]

    response_2 = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=history,
        config=types.GenerateContentConfig(
          tools=[
            types.Tool(
              google_search=types.ToolGoogleSearch(),
              function_declarations=[getWeather]
            ),
          ],
          include_server_side_tool_invocations=True
        ),
    )

### Javascript

    import { GoogleGenAI, Type } from '@google/genai';

    const client = new GoogleGenAI({});

    const getWeather = {
        name: "getWeather",
        description: "Get the weather in a given location",
        parameters: {
            type: "OBJECT",
            properties: {
                location: {
                    type: "STRING",
                    description: "The city and state, e.g. San Francisco, CA"
                }
            },
            required: ["location"]
        }
    };

    async function run() {
        const model = client.models.generateContent({
            model: "gemini-3-flash-preview",
        });

        const tools = [
          { googleSearch: {} },
          { functionDeclarations: [getWeather] }
        ];
        const toolConfig = { includeServerSideToolInvocations: true };

        const result1 = await model.generateContent({
            contents: [{role: "user", parts: [{text: "What is the northernmost city in the United States? What's the weather like there today?"}]}],
            tools: tools,
            toolConfig: toolConfig,
        });

        const response1 = result1.response;
        const functionCallId = response1.candidates[0].content.parts.find(p => p.functionCall)?.functionCall?.id;

        const history = [
            {
                role: "user",
                parts:[{text: "What is the northernmost city in the United States? What's the weather like there today?"}]
            },
            response1.candidates[0].content,
            {
                role: "user",
                parts: [{
                    functionResponse: {
                        name: "getWeather",
                        response: {response: "Very cold. 22 degrees Fahrenheit."},
                        id: functionCallId
                    }
                }]
            }
        ];

        const result2 = await model.generateContent({
            contents: history,
            tools: tools,
            toolConfig: toolConfig,
        });
    }

    run();

For models before the Gemini 3 series, use the
[Live API](https://ai.google.dev/gemini-api/docs/live-api/tools).

## Multimodal function responses

> [!NOTE]
> **Note:** This feature is available for [Gemini 3](https://ai.google.dev/gemini-api/docs/gemini-3) series models.

For Gemini 3 series models, you can include multimodal content in
the function response parts that you send to the model. The model can process
this multimodal content in its next turn to produce a more informed response.
The following MIME types are supported for multimodal content in function
responses:

- **Images** : `image/png`, `image/jpeg`, `image/webp`
- **Documents** : `application/pdf`, `text/plain`

To include multimodal data in a function response, include it as one or more
parts nested within the `functionResponse` part. Each multimodal part must
contain `inlineData`. If you reference a multimodal part from
within the structured `response` field, it must contain a unique `displayName`.

You can also reference a multimodal part from within the structured `response`
field of the `functionResponse` part by using the JSON reference format
`{"$ref": "<displayName>"}`. The model substitutes the reference with the
multimodal content when processing the response. Each `displayName` can only be
referenced once in the structured `response` field.

The following example shows a message containing a `functionResponse` for a
function named `get_image` and a nested part containing image data with
`displayName: "instrument.jpg"`. The `functionResponse`'s `response` field
references this image part:

### Python

    from google import genai
    from google.genai import types

    import requests

    client = genai.Client()

    # This is a manual, two turn multimodal function calling workflow:

    # 1. Define the function tool
    get_image_declaration = types.FunctionDeclaration(
      name="get_image",
      description="Retrieves the image file reference for a specific order item.",
      parameters={
          "type": "object",
          "properties": {
              "item_name": {
                  "type": "string",
                  "description": "The name or description of the item ordered (e.g., 'instrument')."
              }
          },
          "required": ["item_name"],
      },
    )
    tool_config = types.Tool(function_declarations=[get_image_declaration])

    # 2. Send a message that triggers the tool
    prompt = "Show me the instrument I ordered last month."
    response_1 = client.models.generate_content(
      model="gemini-3-flash-preview",
      contents=[prompt],
      config=types.GenerateContentConfig(
          tools=[tool_config],
      )
    )

    # 3. Handle the function call
    function_call = response_1.function_calls[0]
    requested_item = function_call.args["item_name"]
    print(f"Model wants to call: {function_call.name}")

    # Execute your tool (e.g., call an API)
    # (This is a mock response for the example)
    print(f"Calling external tool for: {requested_item}")

    function_response_data = {
      "image_ref": {"$ref": "instrument.jpg"},
    }
    image_path = "https://goo.gle/instrument-img"
    image_bytes = requests.get(image_path).content
    function_response_multimodal_data = types.FunctionResponsePart(
      inline_data=types.FunctionResponseBlob(
        mime_type="image/jpeg",
        display_name="instrument.jpg",
        data=image_bytes,
      )
    )

    # 4. Send the tool's result back
    # Append this turn's messages to history for a final response.
    history = [
      types.Content(role="user", parts=[types.Part(text=prompt)]),
      response_1.candidates[0].content,
      types.Content(
        role="user",
        parts=[
            types.Part.from_function_response(
              id=function_call.id,
              name=function_call.name,
              response=function_response_data,
              parts=[function_response_multimodal_data]
            )
        ],
      )
    ]

    response_2 = client.models.generate_content(
      model="gemini-3-flash-preview",
      contents=history,
      config=types.GenerateContentConfig(
          tools=[tool_config],
          thinking_config=types.ThinkingConfig(include_thoughts=True)
      ),
    )

    print(f"\nFinal model response: {response_2.text}")

### JavaScript

    import { GoogleGenAI, Type } from '@google/genai';

    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // This is a manual, two turn multimodal function calling workflow:
    // 1. Define the function tool
    const getImageDeclaration = {
      name: 'get_image',
      description: 'Retrieves the image file reference for a specific order item.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          item_name: {
            type: Type.STRING,
            description: "The name or description of the item ordered (e.g., 'instrument').",
          },
        },
        required: ['item_name'],
      },
    };

    const toolConfig = {
      functionDeclarations: [getImageDeclaration],
    };

    // 2. Send a message that triggers the tool
    const prompt = 'Show me the instrument I ordered last month.';
    const response1 = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [toolConfig],
      },
    });

    // 3. Handle the function call
    const functionCall = response1.functionCalls[0];
    const requestedItem = functionCall.args.item_name;
    console.log(`Model wants to call: ${functionCall.name}`);

    // Execute your tool (e.g., call an API)
    // (This is a mock response for the example)
    console.log(`Calling external tool for: ${requestedItem}`);

    const functionResponseData = {
      image_ref: { $ref: 'instrument.jpg' },
    };

    const imageUrl = "https://goo.gle/instrument-img";
    const response = await fetch(imageUrl);
    const imageArrayBuffer = await response.arrayBuffer();
    const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');

    const functionResponseMultimodalData = {
      inlineData: {
        mimeType: 'image/jpeg',
        displayName: 'instrument.jpg',
        data: base64ImageData,
      },
    };

    // 4. Send the tool's result back
    // Append this turn's messages to history for a final response.
    const history = [
      { role: 'user', parts: [{ text: prompt }] },
      response1.candidates[0].content,
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: functionCall.id,
              name: functionCall.name,
              response: functionResponseData,
              parts: [functionResponseMultimodalData]
            },
          },
        ],
      },
    ];

    const response2 = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history,
      config: {
        tools: [toolConfig],
        thinkingConfig: { includeThoughts: true },
      },
    });

    console.log(`\nFinal model response: ${response2.text}`);

### REST

    IMG_URL="https://goo.gle/instrument-img"

    MIME_TYPE=$(curl -sIL "$IMG_URL" | grep -i '^content-type:' | awk -F ': ' '{print $2}' | sed 's/\r$//' | head -n 1)
    if [[ -z "$MIME_TYPE" || ! "$MIME_TYPE" == image/* ]]; then
      MIME_TYPE="image/jpeg"
    fi

    # Check for macOS
    if [[ "$(uname)" == "Darwin" ]]; then
      IMAGE_B64=$(curl -sL "$IMG_URL" | base64 -b 0)
    elif [[ "$(base64 --version 2>&1)" = *"FreeBSD"* ]]; then
      IMAGE_B64=$(curl -sL "$IMG_URL" | base64)
    else
      IMAGE_B64=$(curl -sL "$IMG_URL" | base64 -w0)
    fi

    curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" \
      -H "x-goog-api-key: $GEMINI_API_KEY" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d '{
        "contents": [
          ...,
          {
            "role": "user",
            "parts": [
            {
                "functionResponse": {
                  "name": "get_image",
                  "id": "UNIQUE_CALL_ID_HERE",
                  "response": {
                    "image_ref": {
                      "$ref": "instrument.jpg"
                    }
                  },
                  "parts": [
                    {
                      "inlineData": {
                        "displayName": "instrument.jpg",
                        "mimeType":"'"$MIME_TYPE"'",
                        "data": "'"$IMAGE_B64"'"
                      }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }'

## Function calling with Structured output

> [!NOTE]
> **Note:** This feature is available for [Gemini 3](https://ai.google.dev/gemini-api/docs/gemini-3) series models.

For Gemini 3 series models, you can use function calling with
[structured output](https://ai.google.dev/gemini-api/docs/structured-output). This lets the model
predict function calls or outputs that adhere to a specific schema. As a result,
you receive consistently formatted responses when the model doesn't generate
function calls.

## Model context protocol (MCP)

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is
an open standard for connecting AI applications with external tools and data.
MCP provides a common protocol for models to access context, such as functions
(tools), data sources (resources), or predefined prompts.

The Gemini SDKs have built-in support for the MCP, reducing boilerplate code and
offering
[automatic tool calling](https://ai.google.dev/gemini-api/docs/function-calling#automatic_function_calling_python_only)
for MCP tools. When the model generates an MCP tool call, the Python and
JavaScript client SDK can automatically execute the MCP tool and send the
response back to the model in a subsequent request, continuing this loop until
no more tool calls are made by the model.

Here, you can find an example of how to use a local MCP server with Gemini and
`mcp` SDK.

### Python

Make sure the latest version of the
[`mcp` SDK](https://modelcontextprotocol.io/introduction) is installed on
your platform of choice.

    pip install mcp

> [!NOTE]
> **Note:** Python supports automatic tool calling by passing in the `ClientSession` into the `tools` parameters. If you want to disable it, you can provide `automatic_function_calling` with disabled `True`.

    import os
    import asyncio
    from datetime import datetime
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    from google import genai

    client = genai.Client()

    # Create server parameters for stdio connection
    server_params = StdioServerParameters(
        command="npx",  # Executable
        args=["-y", "@philschmid/weather-mcp"],  # MCP Server
        env=None,  # Optional environment variables
    )

    async def run():
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                # Prompt to get the weather for the current day in London.
                prompt = f"What is the weather in London in {datetime.now().strftime('%Y-%m-%d')}?"

                # Initialize the connection between client and server
                await session.initialize()

                # Send request to the model with MCP function declarations
                response = await client.aio.models.generate_content(
                    model="gemini-3-flash-preview",
                    contents=prompt,
                    config=genai.types.GenerateContentConfig(
                        temperature=0,
                        tools=[session],  # uses the session, will automatically call the tool
                        # Uncomment if you **don't** want the SDK to automatically call the tool
                        # automatic_function_calling=genai.types.AutomaticFunctionCallingConfig(
                        #     disable=True
                        # ),
                    ),
                )
                print(response.text)

    # Start the asyncio event loop and run the main function
    asyncio.run(run())

### JavaScript

Make sure the latest version of the `mcp` SDK is installed on your platform
of choice.

    npm install @modelcontextprotocol/sdk

> [!NOTE]
> **Note:** JavaScript supports automatic tool calling by wrapping the `client` with `mcpToTool`. If you want to disable it, you can provide `automaticFunctionCalling` with disabled `true`.

    import { GoogleGenAI, FunctionCallingConfigMode , mcpToTool} from '@google/genai';
    import { Client } from "@modelcontextprotocol/sdk/client/index.js";
    import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

    // Create server parameters for stdio connection
    const serverParams = new StdioClientTransport({
      command: "npx", // Executable
      args: ["-y", "@philschmid/weather-mcp"] // MCP Server
    });

    const client = new Client(
      {
        name: "example-client",
        version: "1.0.0"
      }
    );

    // Configure the client
    const ai = new GoogleGenAI({});

    // Initialize the connection between client and server
    await client.connect(serverParams);

    // Send request to the model with MCP tools
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `What is the weather in London in ${new Date().toLocaleDateString()}?`,
      config: {
        tools: [mcpToTool(client)],  // uses the session, will automatically call the tool
        // Uncomment if you **don't** want the sdk to automatically call the tool
        // automaticFunctionCalling: {
        //   disable: true,
        // },
      },
    });
    console.log(response.text)

    // Close the connection
    await client.close();

### Limitations with built-in MCP support

Built-in MCP support is a [experimental](https://ai.google.dev/gemini-api/docs/models#preview)
feature in our SDKs and has the following limitations:

- Only tools are supported, not resources nor prompts
- It is available for the Python and JavaScript/TypeScript SDK.
- Breaking changes might occur in future releases.

Manual integration of MCP servers is always an option if these limit what you're
building.

## Supported models

This section lists models and their function calling capabilities. Experimental
models are not included. You can find a comprehensive capabilities overview on
the [model overview](https://ai.google.dev/gemini-api/docs/models) page.

| Model | Function calling | Parallel function calling | Compositional function calling |
|---|---|---|---|
| [Gemini 3.1 Pro Preview](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview) | ✔️ | ✔️ | ✔️ |
| [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) | ✔️ | ✔️ | ✔️ |
| [Gemini 3.1 Flash-Lite Preview](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-preview) | ✔️ | ✔️ | ✔️ |
| [Gemini 3 Flash Preview](https://ai.google.dev/gemini-api/docs/models/gemini-3-flash-preview) | ✔️ | ✔️ | ✔️ |
| [Gemini 2.5 Pro](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro) | ✔️ | ✔️ | ✔️ |
| [Gemini 2.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) | ✔️ | ✔️ | ✔️ |
| [Gemini 2.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite) | ✔️ | ✔️ | ✔️ |
| [Gemini 2.0 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.0-flash) | ✔️ | ✔️ | ✔️ |

## Best practices

- **Function and Parameter Descriptions:** Be extremely clear and specific in your descriptions. The model relies on these to choose the correct function and provide appropriate arguments.
- **Naming:** Use descriptive function names (without spaces, periods, or dashes).
- **Strong Typing:** Use specific types (integer, string, enum) for parameters to reduce errors. If a parameter has a limited set of valid values, use an enum.
- **Tool Selection:** While the model can use an arbitrary number of tools, providing too many can increase the risk of selecting an incorrect or suboptimal tool. For best results, aim to provide only the relevant tools for the context or task, ideally keeping the active set to a maximum of 10-20. Consider dynamic tool selection based on conversation context if you have a large total number of tools.
- **Prompt Engineering:**
  - Provide context: Tell the model its role (e.g., "You are a helpful weather assistant.").
  - Give instructions: Specify how and when to use functions (e.g., "Don't guess dates; always use a future date for forecasts.").
  - Encourage clarification: Instruct the model to ask clarifying questions if needed.
  - See [Agentic workflows](https://ai.google.dev/gemini-api/docs/prompting-strategies#agentic-workflows) for further strategies on designing these prompts. Here is an example of a tested [system instruction](https://ai.google.dev/gemini-api/docs/prompting-strategies#agentic-si-template).
- **Temperature:** Use a low temperature (e.g., 0) for more deterministic and
  reliable function calls.

  > [!NOTE]
  > When using Gemini 3 models, we strongly recommend keeping the `temperature` at its default value of 1.0. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance, particularly in complex mathematical or reasoning tasks.

- **Validation:** If a function call has significant consequences (e.g.,
  placing an order), validate the call with the user before executing it.

- **Check Finish Reason:** Always check the [`finishReason`](https://ai.google.dev/api/generate-content#FinishReason)
  in the model's response to handle cases where the model failed to generate a
  valid function call.

- **Error Handling**: Implement robust error handling in your functions to
  gracefully handle unexpected inputs or API failures. Return informative
  error messages that the model can use to generate helpful responses to the
  user.

- **Security:** Be mindful of security when calling external APIs. Use
  appropriate authentication and authorization mechanisms. Avoid exposing
  sensitive data in function calls.

- **Token Limits:** Function descriptions and parameters count towards your
  input token limit. If you're hitting token limits, consider limiting the
  number of functions or the length of the descriptions, break down complex
  tasks into smaller, more focused function sets.

- **Mix of bash and custom tools** For those building with a mix of bash and
  custom tools, Gemini 3.1 Pro Preview
  comes with a separate endpoint available via the API called
  [`gemini-3.1-pro-preview-customtools`](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview#gemini-31-pro-preview-customtools).

## Notes and limitations

- Positioning of function call parts: When using custom function declarations [alongside built-in tools](https://ai.google.dev/gemini-api/docs/tool-combination) (like Google Search), the model may return a mix of `functionCall`, `toolCall`, and `toolResponse` parts in a single turn. Because of this, don't assume the `functionCall` will always be the last item in the parts array. If you are manually parsing the JSON response, always iterate through the parts array rather than relying on position.
- Only a [subset of the OpenAPI
  schema](https://ai.google.dev/api/caching#FunctionDeclaration) is supported.
- For `ANY` mode, the API may reject very large or deeply nested schemas. If you encounter errors, try simplifying your function parameter and response schemas by shortening property names, reducing nesting, or limiting the number of function declarations.
- Supported parameter types in Python are limited.
- Automatic function calling is a Python SDK feature only.







# Prompt design strategies

*Prompt design* is the process of creating prompts, or natural language requests,
that elicit accurate, high quality responses from a language model.

This page introduces basic concepts, strategies, and best practices to get you
started designing prompts to get the most out of Gemini AI models.

> [!NOTE]
> **Note:** Prompt engineering is iterative. These guidelines and templates are starting points. Experiment and refine based on your specific use cases and observed model responses.

## Topic-specific prompt guides

Looking for more specific prompt strategies? Check out our other prompting guides
on:

- [Prompting with media files](https://ai.google.dev/gemini-api/docs/files#prompt-guide)
- Prompting for image generation with [Imagen](https://ai.google.dev/gemini-api/docs/imagen#imagen-prompt-guide) and [Gemini Native Image Generation](https://ai.google.dev/gemini-api/docs/image-generation#prompt-guide)
- [Prompting for video generation](https://ai.google.dev/gemini-api/docs/video#prompt-guide)

You can find other sample prompts in the [prompt gallery](https://ai.google.dev/gemini-api/prompts)
meant to interactively showcase many of the concepts shared in this guide.

## Clear and specific instructions

An effective and efficient way to customize model behavior is to provide it with
clear and specific instructions. Instructions can be in the form of a question,
step-by-step tasks, or as complex as mapping out a user's experience and mindset.

### Input

Input is the required text in the prompt that you want the model to provide a
response to. Inputs can be a question that the model
answers (question input), a task the model performs (task input), an entity the
model operates on (entity input), or partial input that the model completes or
continues (completion input).

| **Input type** | **Prompt** | **Generated output** |
|---|---|---|
| Question | What's a good name for a flower shop that specializes in selling bouquets of dried flowers? Create a list of 5 options with just the names. | Here are 5 names for a flower shop specializing in dried flowers: 1. Everlasting Blooms 2. Dried & Delightful 3. The Petal Preserve 4. Whispers of Wildflowers 5. Forever Blooms |
| Task | ``` Give me a simple list of just the things that I must bring on a camping trip. The list should have 5 items. ``` | ``` 1. **Tent:** Your shelter from the elements. 2. **Sleeping Bag:** Stay warm and comfortable. 3. **Sleeping Pad:** Insulation and cushioning for a good night's sleep. 4. **Headlamp or Flashlight:** Light for nighttime activities. 5. **First Aid Kit:** Be prepared for minor injuries. ``` |
| Entity | Classify the following items as [large, small]: Elephant Mouse Snail | Here's the classification: * **Elephant:** Large * **Mouse:** Small * **Snail:** Small |

#### Partial input completion

Generative language models work like an advanced auto completion tool. When you
provide partial content, the model can provide the rest of the content or what
it thinks is a continuation of that content as a response. When doing so, if you
include any examples or context, the model can take those examples or context
into account.

The following example provides a prompt with an instruction and an entity input:

|---|
| **Prompt:** ``` For the given order, return a JSON object that has the fields cheeseburger, hamburger, fries, or drink, with the value being the quantity. Order: A burger and a drink. ``` **Response:** ``` { "cheeseburger": 0, "hamburger": 1, "fries": 0, "drink": 1 } ``` (gemini-2.5-flash) |

While the model did as prompted, writing out the instructions in natural language
can sometimes be challenging and it leaves a lot to the model's interpretation.
For example, a restaurants menu might contain many items. To reduce the size of
the JSON response, you probably want to omit the items that weren't ordered. In
this case, you can give an example and a response prefix and let the model
complete it:

|---|
| **Prompt:** ```` Valid fields are cheeseburger, hamburger, fries, and drink. Order: Give me a cheeseburger and fries Output: ``` { "cheeseburger": 1, "fries": 1 } ``` Order: I want two burgers, a drink, and fries. Output: ```` **Response:** ```` ``` { "hamburger": 2, "drink": 1, "fries": 1 } ``` ```` (gemini-2.5-flash) |

Notice how "cheeseburger" was excluded from the output because it wasn't a part
of the order.

While you can specify the format of simple JSON response objects using prompts,
we recommend using Gemini API's
[structured output](https://ai.google.dev/gemini-api/docs/structured-output) feature when specifying
a more complex JSON Schema for the response.

### Constraints

Specify any constraints on reading the prompt or generating a response. You can
tell the model what to do and not to do. For example, you can specify a constraint
in the prompt on how long you want a summary to be:

|---|
| **Prompt:** ``` Summarize this text in one sentence: Text: A quantum computer exploits quantum mechanical phenomena to perform calculations exponentially faster than any modern traditional computer. At very tiny scales, physical matter acts as both particles and as waves, and quantum computing uses specialized hardware to leverage this behavior. The operating principles of quantum devices is beyond the scope of classical physics. When deployed at scale, quantum computers could be used in a wide variety of applications such as: in cybersecurity to break existing encryption methods while helping researchers create new ones, in meteorology to develop better weather forecasting etc. However, the current state of the art quantum computers are still largely experimental and impractical. ``` <br /> **Response:** ``` Exploiting quantum mechanical phenomena, quantum computers can perform calculations exponentially faster than traditional computers for potential applications like cybersecurity and meteorology, although they are currently largely experimental and impractical. ``` (gemini-2.5-flash) <br /> |

### Response format

You can give instructions that specify the format of the response. For example,
you can ask for the response to be formatted as a table, bulleted list, elevator
pitch, keywords, sentence, or paragraph. The following system instruction tells
the model to be more conversational in its response:

|---|
| **System instruction** ``` All questions should be answered comprehensively with details, unless the user requests a concise response specifically. ``` **Prompt** ``` What is a smart way to make a business that sells DVD's in 2026? ``` **Response:** ``` Starting a business selling DVDs in 2026 presents significant challenges due to the overwhelming dominance of digital streaming and on-demand services; a "smart" approach would therefore require a highly specialized niche, a strong value proposition beyond just the disc, and likely a focus on community or collector markets rather than mainstream consumption. Here's a breakdown of what a smart DVD business in 2026 would likely entail: 1. Extreme Niche Specialization: You cannot compete with streaming libraries. Your business must focus on what digital doesn't offer easily or at all. This could include: * Out-of-Print & Rare Titles: Sourcing films or TV shows that have never been released digitally or are currently unavailable on major streaming platforms. .... ``` (gemini-2.5-flash) |

#### Format responses with the completion strategy

The [completion strategy](https://ai.google.dev/gemini-api/docs/prompting-strategies#completion) can also help format the response.
The following example prompts the model to create an essay outline:

|---|
| **Prompt:** ``` Create an outline for an essay about hummingbirds. ``` **Response:** ``` Here is a possible outline for an essay about hummingbirds: I. Introduction A. Hook: Start with a captivating fact or description about hummingbirds (e.g., their speed, iridescent colors, or tiny size). B. Background: Briefly introduce hummingbirds – where they are found (Americas), their reputation as unique birds. C. Thesis Statement: State the main point of the essay, which could be about the remarkable adaptations, behaviors, and ecological importance of hummingbirds. II. Appearance and Identification ..... ``` (gemini-2.5-flash) |

The prompt didn't specify the format for the outline and the model chose a format
for you. To get the model to return an outline in a specific format, you can add
text that represents the start of the outline and let the model complete it based
on the pattern that you initiated.

|---|
| **Prompt:** ``` Create an outline for an essay about hummingbirds. I. Introduction * ``` **Response:** ``` Okay, here is an outline for an essay about hummingbirds, starting from the introduction you provided: I. Introduction * Hook: Start with a captivating fact or description about hummingbirds (e.g., their speed, iridescent colors, or tiny size). * Background: Briefly introduce hummingbirds – where they are found (Americas), their reputation as unique birds, and their general characteristics. * Thesis Statement: State the main point of the essay, focusing on the remarkable adaptations, behaviors, and ecological significance that make hummingbirds extraordinary. ..... ``` (gemini-2.5-flash) |

## Zero-shot vs few-shot prompts

You can include examples in the prompt that show the model what getting it right
looks like. The model attempts to identify patterns and relationships from the
examples and applies them when generating a response. Prompts that contain a few
examples are called *few-shot* prompts, while prompts that provide no
examples are called *zero-shot* prompts. Few-shot prompts are often used
to regulate the formatting, phrasing, scoping, or general patterning of model
responses. Use specific and varied examples to help the model narrow its focus
and generate more accurate results.

We recommend to always include few-shot examples in your prompts. Prompts without
few-shot examples are likely to be less effective. In fact, you can remove
instructions from your prompt if your examples are clear enough in showing the
task at hand.

The following zero-shot prompt asks the model to choose the best explanation.

|---|
| **Prompt:** ``` Please choose the best explanation to the question: Question: How is snow formed? Explanation1: Snow is formed when water vapor in the air freezes into ice crystals in the atmosphere, which can combine and grow into snowflakes as they fall through the atmosphere and accumulate on the ground. Explanation2: Water vapor freezes into ice crystals forming snow. Answer: ``` **Response:** ``` Explanation1 is the better explanation because it provides more detail on the process, including how ice crystals combine and grow into snowflakes as they fall through the atmosphere. ``` (gemini-2.5-flash) |

If your use case requires the model to produce concise responses, you can include
examples in the prompt that give preference to concise responses.

The following prompt provides two examples that show preference to the shorter
explanations. In the response, you can see that the examples guided the model to
choose the shorter explanation (`Explanation2`) as opposed to the longer
explanation (`Explanation1`) like it did previously.

|---|
| **Prompt:** ``` Below are some examples showing a question, explanation, and answer format: Question: Why is the sky blue? Explanation1: The sky appears blue because of Rayleigh scattering, which causes shorter blue wavelengths of light to be scattered more easily than longer red wavelengths, making the sky look blue. Explanation2: Due to Rayleigh scattering effect. Answer: Explanation2 Question: What is the cause of earthquakes? Explanation1: Sudden release of energy in the Earth's crust. Explanation2: Earthquakes happen when tectonic plates suddenly slip or break apart, causing a release of energy that creates seismic waves that can shake the ground and cause damage. Answer: Explanation1 Now, Answer the following question given the example formats above: Question: How is snow formed? Explanation1: Snow is formed when water vapor in the air freezes into ice crystals in the atmosphere, which can combine and grow into snowflakes as they fall through the atmosphere and accumulate on the ground. Explanation2: Water vapor freezes into ice crystals forming snow. Answer: ``` **Response:** ``` Answer: Explanation2 ``` (gemini-2.5-flash) |

### Optimal number of examples

Models like Gemini can often pick up on patterns using a few examples, though
you may need to experiment with the number of examples to provide in the prompt
for the best results. At the same time, if you include too many examples,
the model may start to [overfit](https://developers.google.com/machine-learning/glossary#overfitting)
the response to the examples.

### Consistent formatting

Make sure that the structure and formatting of few-shot examples are the same to
avoid responses with undesired formats. One of the primary objectives of adding
few-shot examples in prompts is to show the model the response format. Therefore,
it is essential to ensure a consistent format across all examples, especially
paying attention to XML tags, white spaces, newlines, and example splitters.

## Add context

You can include instructions and information in a prompt that the model needs
to solve a problem, instead of assuming that the model has all of the required
information. This contextual information helps the model understand the constraints
and details of what you're asking for it to do.

The following example asks the model to give troubleshooting guidance for a router:

|---|
| **Prompt:** ``` What should I do to fix my disconnected wifi? The light on my Google Wifi router is yellow and blinking slowly. ``` **Response:** ``` A yellow blinking light on your Google Wifi router usually indicates a problem with the internet connection. Here are some steps to troubleshoot and fix the issue: 1. Restart your router and modem: - Unplug your modem from the power outlet and wait for 30 seconds. - Plug your modem back in and wait for it to fully boot up. - Unplug your Google Wifi router and wait for 30 seconds. - Plug your Google Wifi router back in and wait for it to fully boot up. ..... ``` (gemini-2.5-flash) |

The response looks like generic troubleshooting information that's not specific
to the router or the status of the LED indicator lights.

To customize the response for the specific router, you can add to the prompt the router's
troubleshooting guide as context for it to refer to when providing a response.

|---|
| **Prompt:** ``` Answer the question using the text below. Respond with only the text provided. Question: What should I do to fix my disconnected wifi? The light on my Google Wifi router is yellow and blinking slowly. Text: Color: Slowly pulsing yellow What it means: There is a network error. What to do: Check that the Ethernet cable is connected to both your router and your modem and both devices are turned on. You might need to unplug and plug in each device again. Color: Fast blinking yellow What it means: You are holding down the reset button and are factory resetting this device. What to do: If you keep holding down the reset button, after about 12 seconds, the light will turn solid yellow. Once it is solid yellow, let go of the factory reset button. Color: Solid yellow What it means: Router is factory resetting. What to do: This can take up to 10 minutes. When it's done, the device will reset itself and start pulsing white, letting you know it's ready for setup. Color: Solid red What it means: Something is wrong. What to do: Critical failure. Factory reset the router. If the light stays red, contact Wifi customer support. ``` **Response:** ``` Check that the Ethernet cable is connected to both your router and your modem and both devices are turned on. You might need to unplug and plug in each device again. ``` (gemini-2.5-flash) |

## Break down prompts into components

For use cases that require complex prompts, you can help the model manage this
complexity by breaking things down into simpler components.

1. **Break down instructions:** Instead of having many instructions in one
   prompt, create one prompt per instruction. You can choose which prompt to
   process based on the user's input.

2. **Chain prompts:** For complex tasks that involve multiple sequential steps,
   make each step a prompt and chain the prompts together in a sequence. In this
   sequential chain of prompts, the output of one prompt in the sequence becomes
   the input of the next prompt. The output of the last prompt in the sequence
   is the final output.

3. **Aggregate responses:** Aggregation is when you want to perform different
   parallel tasks on different portions of the data and aggregate the results to
   produce the final output. For example, you can tell the model to perform one
   operation on the first part of the data, perform another operation on the rest
   of the data and aggregate the results.

## Experiment with model parameters

Each call that you send to a model includes parameter values that control how
the model generates a response. The model can generate different results for
different parameter values. Experiment with different parameter values to get
the best values for the task. The parameters available for
different models may differ. The most common parameters are the following:

1. **Max output tokens:** Specifies the maximum number of tokens that can be
   generated in the response. A token is approximately four characters. 100
   tokens correspond to roughly 60-80 words.

2. **Temperature:** The temperature controls the degree of randomness in token
   selection. The temperature is used for sampling during response generation,
   which occurs when `topP` and `topK` are applied. Lower temperatures are good
   for prompts that require a more deterministic or less open-ended response,
   while higher temperatures can lead to more diverse or creative results. A
   temperature of 0 is deterministic, meaning that the highest probability
   response is always selected.

   > [!NOTE]
   > **Note:** When using Gemini 3 models, we strongly recommend keeping the `temperature` at its default value of 1.0. Changing the temperature (setting it below 1.0) may lead to unexpected behavior, such as looping or degraded performance, particularly in complex mathematical or reasoning tasks.

3. **`topK`:** The `topK` parameter changes how the model selects tokens for
   output. A `topK` of 1 means the selected token is the most probable among
   all the tokens in the model's vocabulary (also called greedy decoding),
   while a `topK` of 3 means that the next token is selected from among the 3
   most probable using the temperature. For each token selection step, the
   `topK` tokens with the highest probabilities are sampled. Tokens are then
   further filtered based on `topP` with the final token selected using
   temperature sampling.

4. **`topP`:** The `topP` parameter changes how the model selects tokens for
   output. Tokens are selected from the most to least probable until the sum of
   their probabilities equals the `topP` value. For example, if tokens A, B,
   and C have a probability of 0.3, 0.2, and 0.1 and the `topP` value is 0.5,
   then the model will select either A or B as the next token by using the
   temperature and exclude C as a candidate. The default `topP` value is 0.95.

5. **`stop_sequences`:** Set a stop sequence to
   tell the model to stop generating content. A stop sequence can be any
   sequence of characters. Try to avoid using a sequence of characters that
   may appear in the generated content.

## Prompt iteration strategies

Prompt design can sometimes require a few iterations before
you consistently get the response you're looking for. This section provides
guidance on some things you can try when iterating on your prompts:

1. **Use different phrasing:** Using different words or phrasing in your prompts
   often yields different responses from the model even though they all mean the
   same thing. If you're not getting the expected results from your prompt, try
   rephrasing it.

   |---|
   | ``` Version 1: How do I bake a pie? Version 2: Suggest a recipe for a pie. Version 3: What's a good pie recipe? ``` <br /> |

2. **Switch to an analogous task:** If you can't get the model to follow your
   instructions for a task, try giving it instructions for an analogous task
   that achieves the same result.

   This prompt tells the model to categorize a book by using predefined categories:

   |---|
   | **Prompt:** ``` Which category does The Odyssey belong to: thriller sci-fi mythology biography ``` **Response:** ``` The Odyssey belongs to the category of **mythology**. Here's why: * **Mythology:** The Odyssey tells the story of Odysseus, a hero from Greek mythology, and his journey home after the Trojan War. It features gods, monsters, and supernatural events common to Greek mythology. ..... ``` (gemini-2.5-flash) |

   The response is correct, but the model didn't stay within the bounds of the
   options. You also want to model to just respond with one of the options instead
   of in a full sentence. In this case, you can rephrase the instructions as a
   multiple choice question and ask the model to choose an option.

   <br />

   |---|
   | **Prompt:** ``` Multiple choice problem: Which of the following options describes the book The Odyssey? Options: - thriller - sci-fi - mythology - biography ``` **Response:** ``` The correct answer is mythology. ``` (gemini-2.5-flash) |

3. **Change the order of prompt content:** The order of the content in the prompt
   can sometimes affect the response. Try changing the content order and see
   how that affects the response.

       Version 1:
       [examples]
       [context]
       [input]

       Version 2:
       [input]
       [examples]
       [context]

       Version 3:
       [examples]
       [input]
       [context]

## Fallback responses

A fallback response is a response returned by the model when either the prompt
or the response triggers a safety filter. An example of a fallback response is
"I'm not able to help with that, as I'm only a language model."

If the model responds with a fallback response, try increasing the temperature.

## Grounding and code execution

Gemini is able to use tools to avoid hallucinations in scenarios where it might
otherwise produce incorrect responses.

[Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search) connects the
Gemini model to real-time web content, and should be enabled whenever the model
may need to know obscure or recent facts.

Gemini's [code execution tool](https://ai.google.dev/gemini-api/docs/code-execution) enables the
model to generate and run Python code, and should be enabled whenever the model
needs to perform any kind of arithmetic, counting, or calculation.

## Gemini 3

[Gemini 3 models](https://ai.google.dev/gemini-api/docs/models#gemini-3) are designed for advanced
reasoning and instruction following.
They respond best to prompts that are direct, well-structured, and clearly
define the task and any constraints. The following practices are recommended for
optimal results with Gemini 3:

### Core prompting principles

- **Be precise and direct:** State your goal clearly and concisely. Avoid unnecessary or overly persuasive language.
- **Use consistent structure:** Employ clear delimiters to separate different parts of your prompt. XML-style tags (e.g., `<context>`, `<task>`) or Markdown headings are effective. Choose one format and use it consistently within a single prompt.
- **Define parameters:** Explicitly explain any ambiguous terms or parameters.
- **Control output verbosity:** By default, Gemini 3 models provide direct and efficient answers. If you need a more conversational or detailed response, you must explicitly request it in your instructions.
- **Handle multimodal inputs coherently:** When using text, images, audio, or video, treat them as equal-class inputs. Ensure your instructions clearly reference each modality as needed.
- **Prioritize critical instructions:** Place essential behavioral constraints, role definitions (persona), and output format requirements in the System Instruction or at the very beginning of the user prompt.
- **Structure for long contexts:** When providing large amounts of context (e.g., documents, code), supply all the context first. Place your specific instructions or questions at the very *end* of the prompt.
- **Anchor context:** After a large block of data, use a clear transition phrase to bridge the context and your query, such as "Based on the information above..."

### Gemini 3 Flash strategies

- **Current day accuracy:** Add the following clause to the system
  instructions to help the model pay attention to the current day being in 2026:

      For time-sensitive user queries that require up-to-date information, you
      MUST follow the provided current time (date and year) when formulating
      search queries in tool calls. Remember it is 2026 this year.

- **Knowledge cutoff accuracy:** Add the following clause to the system
  instructions to make the model aware of its knowledge cutoff:

      Your knowledge cutoff date is January 2025.

- **Grounding performance:** Add the following clause to the system
  instructions (with edits where appropriate) to improve the model's ability
  to ground responses in provided context:

      You are a strictly grounded assistant limited to the information provided in
      the User Context. In your answers, rely **only** on the facts that are
      directly mentioned in that context. You must **not** access or utilize your
      own knowledge or common sense to answer. Do not assume or infer from the
      provided facts; simply report them exactly as they appear. Your answer must
      be factual and fully truthful to the provided text, leaving absolutely no
      room for speculation or interpretation. Treat the provided context as the
      absolute limit of truth; any facts or details that are not directly
      mentioned in the context must be considered **completely untruthful** and
      **completely unsupported**. If the exact answer is not explicitly written in
      the context, you must state that the information is not available.

### Enhancing reasoning and planning

Gemini 2.5 and 3 series models automatically generate internal "thinking" text
to improve reasoning performance. As such, it's generally not necessary to have
the model outline, plan, or detail reasoning steps in the returned response
itself. For problems that require heavy reasoning, simple requests like "Think
very hard before answering" can improve performance, though at the cost of
extra thinking tokens.

See the [Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking) documentation for more
detail.

### Structured prompting examples

Using tags or Markdown helps the model distinguish between instructions,
context, and tasks.

**XML example:**

    <role>
    You are a helpful assistant.
    </role>

    <constraints>
    1. Be objective.
    2. Cite sources.
    </constraints>

    <context>
    [Insert User Input Here - The model knows this is data, not instructions]
    </context>

    <task>
    [Insert the specific user request here]
    </task>

**Markdown example:**

    # Identity
    You are a senior solution architect.

    # Constraints
    - No external libraries allowed.
    - Python 3.11+ syntax only.

    # Output format
    Return a single code block.

### Example template combining best practices

This template captures the core principles for prompting with Gemini 3. Always
make sure to iterate and modify for your specific use case.

**System Instruction:**

    <role>
    You are Gemini 3, a specialized assistant for [Insert Domain, e.g., Data Science].
    You are precise, analytical, and persistent.
    </role>

    <instructions>
    1. **Plan**: Analyze the task and create a step-by-step plan.
    2. **Execute**: Carry out the plan.
    3. **Validate**: Review your output against the user's task.
    4. **Format**: Present the final answer in the requested structure.
    </instructions>

    <constraints>
    - Verbosity: [Specify Low/Medium/High]
    - Tone: [Specify Formal/Casual/Technical]
    </constraints>

    <output_format>
    Structure your response as follows:
    1. **Executive Summary**: [Short overview]
    2. **Detailed Response**: [The main content]
    </output_format>

**User Prompt:**

    <context>
    [Insert relevant documents, code snippets, or background info here]
    </context>

    <task>
    [Insert specific user request here]
    </task>

    <final_instruction>
    Remember to think step-by-step before answering.
    </final_instruction>

## Agentic workflows

For deep agentic workflows, specific instructions are often required to control how the model reasons, plans, and executes tasks. While Gemini provides strong general performance, complex agents often require you to configure the trade-off between computational cost (latency and tokens) and task accuracy.

When designing prompts for agents, consider the following dimensions of behavior that you can steer in the agent:

### Reasoning and strategy

Configuration for how the model thinks and plans before taking action.

- **Logical decomposition:** Defines how thoroughly the model must analyze constraints, prerequisites, and the order of operations.
- **Problem diagnosis**: Controls the depth of analysis when identifying causes and the model's use of abductive reasoning. Determines if the model should accept the most obvious answer or explore complex, less probable explanations.
- **Information exhaustiveness:** The trade-off between analyzing every available policy and document versus prioritizing efficiency and speed.

### Execution and reliability

Configuration for how the agent operates autonomously and handles roadblocks.

- **Adaptability:** How the model reacts to new data. Determines whether it should strictly adhere to its initial plan or pivot immediately when observations contradict assumptions.
- **Persistence and Recovery:** The degree to which the model attempts to self-correct errors. High persistence increases success rates but risks higher token costs or loops.
- **Risk Assessment:** The logic for evaluating consequences. Explicitly distinguishes between low-risk exploratory actions (reads) and high-risk state changes (writes).

### Interaction and output

Configuration for how the agent communicates with the user and formats results.

- **Ambiguity and permission handling:** Defines when the model is permitted to make assumptions versus when it must pause execution to ask the user for clarification or permission.
- **Verbosity:** Controls the volume of text generated alongside tool calls. This determines if the model explains its actions to the user or remains silent during execution.
- **Precision and completeness:** The required fidelity of the output. Specifies whether the model must solve for every edge case and provide exact figures or if ballpark estimates are acceptable.

### System instruction template

The following system instruction is an example that has been evaluated by researchers to improve performance on agentic benchmarks where the model must adhere to a complex rulebook and interact with a user. It encourages the agent to act as a strong reasoner and planner, enforces specific behaviors across dimensions listed above and requires the model to proactively plan before taking any action.

You can adapt this template to fit your specific use case constraints.

    You are a very strong reasoner and planner. Use these critical instructions to structure your plans, thoughts, and responses.

    Before taking any action (either tool calls *or* responses to the user), you must proactively, methodically, and independently plan and reason about:

    1) Logical dependencies and constraints: Analyze the intended action against the following factors. Resolve conflicts in order of importance:
        1.1) Policy-based rules, mandatory prerequisites, and constraints.
        1.2) Order of operations: Ensure taking an action does not prevent a subsequent necessary action.
            1.2.1) The user may request actions in a random order, but you may need to reorder operations to maximize successful completion of the task.
        1.3) Other prerequisites (information and/or actions needed).
        1.4) Explicit user constraints or preferences.

    2) Risk assessment: What are the consequences of taking the action? Will the new state cause any future issues?
        2.1) For exploratory tasks (like searches), missing *optional* parameters is a LOW risk. **Prefer calling the tool with the available information over asking the user, unless** your `Rule 1` (Logical Dependencies) reasoning determines that optional information is required for a later step in your plan.

    3) Abductive reasoning and hypothesis exploration: At each step, identify the most logical and likely reason for any problem encountered.
        3.1) Look beyond immediate or obvious causes. The most likely reason may not be the simplest and may require deeper inference.
        3.2) Hypotheses may require additional research. Each hypothesis may take multiple steps to test.
        3.3) Prioritize hypotheses based on likelihood, but do not discard less likely ones prematurely. A low-probability event may still be the root cause.

    4) Outcome evaluation and adaptability: Does the previous observation require any changes to your plan?
        4.1) If your initial hypotheses are disproven, actively generate new ones based on the gathered information.

    5) Information availability: Incorporate all applicable and alternative sources of information, including:
        5.1) Using available tools and their capabilities
        5.2) All policies, rules, checklists, and constraints
        5.3) Previous observations and conversation history
        5.4) Information only available by asking the user

    6) Precision and Grounding: Ensure your reasoning is extremely precise and relevant to each exact ongoing situation.
        6.1) Verify your claims by quoting the exact applicable information (including policies) when referring to them. 

    7) Completeness: Ensure that all requirements, constraints, options, and preferences are exhaustively incorporated into your plan.
        7.1) Resolve conflicts using the order of importance in #1.
        7.2) Avoid premature conclusions: There may be multiple relevant options for a given situation.
            7.2.1) To check for whether an option is relevant, reason about all information sources from #5.
            7.2.2) You may need to consult the user to even know whether something is applicable. Do not assume it is not applicable without checking.
        7.3) Review applicable sources of information from #5 to confirm which are relevant to the current state.

    8) Persistence and patience: Do not give up unless all the reasoning above is exhausted.
        8.1) Don't be dissuaded by time taken or user frustration.
        8.2) This persistence must be intelligent: On *transient* errors (e.g. please try again), you *must* retry **unless an explicit retry limit (e.g., max x tries) has been reached**. If such a limit is hit, you *must* stop. On *other* errors, you must change your strategy or arguments, not repeat the same failed call.

    9) Inhibit your response: only take an action after all the above reasoning is completed. Once you've taken an action, you cannot take it back.

## Next steps

- Now that you have a deeper understanding of prompt design, try writing your own prompts using [Google AI Studio](http://aistudio.google.com).
- To learn about multimodal prompting, see [Prompting with media files](https://ai.google.dev/gemini-api/docs/files#prompt-guide).
- To learn about image prompting, see the [Nano Banana](https://ai.google.dev/gemini-api/docs/image-generation#prompt-guide) and [Imagen](https://ai.google.dev/gemini-api/docs/imagen#imagen-prompt-guide) prompt guides.
- To learn about video prompting, see the [Veo prompt guide](https://ai.google.dev/gemini-api/docs/video#prompt-guide).