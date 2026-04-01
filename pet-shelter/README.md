# Pet Shelter

A dataset consisting of 16 pets at 7 different animal shelters, awaiting their new home.

- **Period:** 2025-2026, semester 2
- **Language:** Dutch (Nederlands)

## Usage of AI for this dataset

**TL;DR:** AI was used to give me inspiration, and to generate the dataset and images.

### Inspiration

I couldn't come up with an idea for this project, so I used [qwen3.5:9b](https://ollama.com/library/qwen3.5) locally
with [Ollama](https://ollama.com) for inspiration by simply feeding it the assignment (as demonstrated by the teacher).

### The actual dataset

That local model was hallucinating a bit too much to produce a good dataset though. I guess that's what I get for trying
to run AI with an AMD GPU that has 16 GB of VRAM. So to generate the dataset I instead used **GPT-5 mini**
via [Duck.ai](https://duck.ai).

I gave it some guidelines by
putting comments in the [TypeScript declarations](./types.d.ts) (which are also in Dutch), though in typical (free) LLM
fashion it still hallucinated a bit and didn't follow some of them. *(Oh, and it also didn't give me code blocks like
the first time I tried to generate it, so copying was a bit annoying...)*

One of the mistakes it made was confusing guinea pig breeds with similar cat ones, which I've corrected manually.
It also messed up some of the counts I asked for, although I actually messed one of those up in the prompt. I wouldn't
be surprised if there are more of these mistakes...

*Well, I did end up using the local model for the last pet in the dataset (which was added later), because the dataset
was too big to paste into Duck.ai. Probably could've given it the TypeScript declarations again, but it's fine.)*

### Images

Pet images were generated locally using [Z-Image-Turbo](https://comfy.org/workflows/image_z_image_turbo/)
in [ComfyUI](https://comfy.org). But because of hallucinations again, animal shelter images had to be generated
with [Qwen Image 2512](https://huggingface.co/unsloth/Qwen-Image-2512-GGUF) (a quantised **GGUF** version of it because
of my lack of VRAM again, which probably reduced the output quality a fair bit).

I created the prompts and automatically generated and converted the images
with [this very crude program](../dataset-tools) that I spent way too much time writing. You can find the
prompts it ended up with in [this JSON file](./images/prompts.json), although many of them will be outdated or
incorrect, either because of a bug in my program or because the AI produced bad images. But hey, at least they're in
English this time around. *(because it made the images a bit better)*
