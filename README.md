# dddice Foundry VTT Plugin

Roll 3D dice from Foundry VTT! Integrates [dddice](https://dddice.com) with Foundry VTT, providing you with a seamless dice rolling experience. Use dddice to overlay dice on your stream or simply share the fun of dice rolling in a private room.

![dddice Foundry VTT Plugin](./assets/dddice-foundry-plugin.gif?raw=true)

## dddice vs. Dice So Nice

[Dice So Nice](https://foundryvtt.com/packages/dice-so-nice/) is another 3D dice plugin for Foundry VTT, but there are few key features that separate dddice.

- **Roll Anywhere** - dddice is an external service that allows you to roll 3D dice from our own site, Foundry VTT, D&D Beyond, and other VTTs.
- **Synced Rolls** - Even better, dddice syncs rolls from all these platforms for a seamless rolling experience no matter where you are.
- **Streaming Mode** - dddice's Streaming Mode renders your party's rolls transparently over your stream using tools like OBS or Streamlabs. [Learn More](https://dddice.com/for-streamers).
- **Customize Dice** - Easily customize dice and share with your friends (or foes) using our simple [dice editor](https://dddice.com/editor?ref=foundry).

For more information, visit the official [dddice homepage](https://dddice.com?ref=foundry).

## Can I use dddice and Dice So Nice together?

**Yes!**

dddice and Dice So Nice play very well together. Roll your favorite dice using Dice So Nice and let dddice handle the synchronization features that let you roll on platforms such as D&D Beyond and more.

1. Install and enable both dddice and Dice So Nice.
2. In the module settings of dddice set `Render Mode` to `off`. This lets Dice So Nice handle Foundry VTT animations.
3. dddice will pick up the rolls and send it to anyone else that is connected to the same dddice room.

**Caveat**: Your Dice So Nice themes won't show up externally; the dddice theme you selected during configuration will be used instead. Similarly, rolls made outside of Foundry VTT will show up in your instance and be handed off to Dice So Nice to be rolled with the theme selected in your Dice So Nice configs.
## Feedback

dddice is built with our community in mind! We are extremely interested in your feedback. Interested in connecting with us?

- [Become a backer on Patreon](https://www.patreon.com/dddice)
- [Join the dddice Discord Server](https://discord.gg/NsNnd8xQ6K)
- [Follow dddice on Twitter](https://twitter.com/dddice_app)
- [Join the dddice subreddit](https://reddit.com/r/dddice)
- [Subscribe to dddice on YouTube](https://www.youtube.com/channel/UC8OaoMy-oFAvebUi_rOc1dQ)
- [Follow dddice on Twitch](https://www.twitch.tv/dddice_app)

## Documentation and API

dddice features a robust API and SDK to build applications with.

- [API Documentation](https://docs.dddice.com/api?ref=foundry)
- [SDK Documentation](https://docs.dddice.com/sdk/js/latest?ref=foundry)

## Compatability

dddice is compatible with Foundry VTT v9+, 10+.

## Development

If you would like to contribute to this extension, follow the instructions below.

You will need [Node.js](https://nodejs.org/en/) and [NPM](https://www.npmjs.com/).

```shell
# Clone this repository
git clone git@github.com:dddice/dddice-foundry-plugin.git

# Install dependencies
npm i

# Start the package bundler
npm run start
```

## License

MIT
