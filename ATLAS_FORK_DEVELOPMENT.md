# Midnight Factory · ATLAS Fork

**Source is an original game by Gakuseei**, not authored by AincFh.
Upstream: https://github.com/Gakuseei/Midnight-Factory
License: [MIT](LICENSE), preserved with full upstream source code.

## Fork changes
- Add a GitHub Pages entry point `index.html` redirecting to the original single-file factory game.
- Add a CI release gate with static smoke tests and public Pages deployment.
- Do not modify upstream game mechanics until a separate, tested PR is reviewed.

## Development opportunities
1. Add bilingual UI (Chinese/English), avoiding machine translation of game terminology in the renderer.
2. Add export/import save for moving between browsers.
3. Expand production chains and tutorial onboarding.
4. Verify production balance after 30 minutes of actual gameplay and touch input.
5. Improve rendering performance without replacing the original visual language.

## QA scope
CI checks file references and the delivery package only. A full gameplay QA must open the Pages URL, place conveyors and machines, process items, confirm money balance and persistence, then reload. No CI result should be treated as proof of gameplay completeness.
