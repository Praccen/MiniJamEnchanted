### What is it

#### Elevator pitch
A rougelite top down 3D procedurally generated dungeon crawler wher you pull a cart with a fire. 
You have to fuel the cart with coal/wood. Some theives/creatures/whatever steal fuel if you are not close to the cart.
The cart is your light source (maybe you can bring a torch though).
Combat is real time with abilities.

#### Special features that can be part of the game
Narrow passages where the cart doesn't fit, and low openings where only the cart fits, so you sometimes have to push the cart through and walk around etc.
Underwater caves with water, where you have to sail.
Tracks that you push the cart on (Can you ride the cart maybe? Gringots similar tracks.)
Lava pits (maybe these generate the wind needed for sailing in the water caves?)
Lava shader that's below the floor, so it's easy to leave holes in the floor and see the lava through it. Put the directional light below the ground pointing upwards (will create cool god rays hopefully)
Cart can break and then you need to find replacement parts, forcing you to leave the cart momentarely. (Generate these scenarios where parts are somewhere close)
No skills, talents or player stats, instead use inventory management to create synergies like if this trinket is next to a weapon, the weapon repeats its attack once etc.

#### Questions
Who is the main character? Human? Spider? Gnome?
What's the main characters motivation? Is it stuck and trying to get out? Is it traveling deeper to find fortune? (Maybe deeper as that will fit the procedurally generated / endless nature of a rougelite)
How to keep the game interesting and puzzle elements non repetitive?

### Setup

```
npm run setup
```

Will install all needed packages

### Compile

```
npm run build
```

or for watch build of game files which will auto rebuild as soon as a file is saved.

```
npm run dev 
```

There are tasks setup for this if you are using vscode (located in the .vscode folder)

### Formatting

```
npm run format
```

### Running

```
1. Setup a server that hosts the root of this repo
2. Goto the [server address]/Game in a browser
```
