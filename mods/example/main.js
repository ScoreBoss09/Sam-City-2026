// A mod script: called once, with the game and a small helper API (see docs/MODDING.md).
export default function (game, api) {
  // every morning at nine, somebody shouts about the football results
  game.clock.on('hour', () => {
    if (Math.floor(game.clock.hour) !== 9 || !game.started) return;
    const s = game.population.sims.find((q) => q.kind === 'resident' && q.mesh.visible);
    if (s) api.say(s, 'Did you see the score last night? Unbelievable!');
  });
}
