export const CatBuildLog = `

forward = 0.0, 0.0, -1.0

// Head (base)
colour = CSS:rgb(66, 66, 65)
width = 0.2
length = 0.2
make head

// Neck
parent head
width = 0.1
length = 0.1
resolution = snap
degrees = 5
axis = 0.0, -1.0, 1.0
make neck

// Two shoulders
parent neck
length = 0.1
width = 0.1
axis = -1.0, 0.0, 0.0
degrees = 0
resolution = snap
make leftShoulder
axis = 1.0, 0.0, 0.0
make rightShoulder

// Left Front Leg
parent leftShoulder
resolution = flerp
axis = 0.0, -1.0, 0.35
degrees = 40
width = 0.1
length = 0.3
make leftFrontLeg

// Right Front Leg
parent rightShoulder
axis = 0.0, -1.0, 0.35
make rightFrontLeg

// Left Front Paw
parent leftFrontLeg
resolution = snap
degrees = 20
axis = 0.3, -1.0, -0.6
make leftFrontPaw

// Right Front paw
parent rightFrontLeg
axis = -0.3, -1.0, -0.6
make rightFrontPaw

// Torso
parent neck
width = 0.15
length = 0.2
axis = 0.0, 0.0, 1.0
degrees = 20
resolution = snap
make torso

// LowerBody
parent torso
make lowerBody

// Two hips
parent lowerBody
width = 0.12
length = 0.12
axis = -1.0, 0.0, 0.0
degrees = 0
make leftHip
axis = 1.0, 0.0, 0.0
make rightHip

// Left hind Leg
parent leftHip
resolution = flerp
degrees = 40
axis = 0.0, -1.0, 0.6
length = 0.25
width = 0.1
make leftHindLeg

// Right Hind Leg
parent rightHip
axis = 0.0, -1.0, 0.6
make rightHindLeg

// Left paw
parent leftHindLeg
resolution = snap
degrees = 20
axis = 0.3, -1.0, -0.6
make leftHindPaw

// Right paw
parent rightHindLeg
axis = -0.3, -1.0, -0.6
make rightHindPaw

// Tail1
parent lowerBody
resolution = flerp
width = 0.1
length = 0.2
degrees = 25
axis = 0.0, 0.2, 1.0
make tail1

// Tail2
resolution = snap
degrees = 25
axis = 0.0, 1.0, 0.0
parent tail1
make tail2

parent tail2
make tail3

parent tail3
make tail4

exflerp leftFrontLeg rightFrontLeg
exflerp leftHindLeg rightHindLeg
`;
