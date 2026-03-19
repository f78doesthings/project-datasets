# Pet Shelter
A dataset consisting of 16 pets at 7 different animal shelters, awaiting their new home.

- **Period:** 2025-2026 S2
- **Language:** Dutch (Nederlands)

## AI usage
I used [qwen3.5:9b](https://ollama.com/library/qwen3.5) locally with [Ollama](https://ollama.com) for inspiration by simply feeding it the assignment (as demonstrated by the teacher). That model was hallucinating a bit too much to produce a good dataset though. I guess that's what I get for trying to run AI with 16 GB of VRAM.

To generate the dataset I used **GPT-5 mini** via [Duck.ai](https://duck.ai) instead. I gave it some guidelines by putting comments in the [TypeScript declarations](./types.d.ts) (which are also in Dutch), though in typical LLM fashion it still hallucinated a bit and didn't follow some of them. *(It also didn't give me code blocks like the first time I tried to generate it, so copying was a bit annoying...)*

Images will be generated locally using the [Z-Image-Turbo](https://comfy.org/workflows/image_z_image_turbo/) workflow in [ComfyUI](https://comfy.org), if all goes well.
