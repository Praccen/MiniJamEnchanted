export const HumanoidBuildLog = `

forward = 0.0, 0.0, -1.0

// Neck (base)
colour = CSS:rgb(193, 161, 112)
width = 0.1
length = 0.1
make neck

// Head
parent neck
width = 0.3
length = 0.3
resolution = snap
degrees = 5
axis = 0.0, 1.0, -0.05
make head

// Two shoulders
colour = CSS:rgb(33, 79, 50)
length = 0.2
width = 0.2
axis = -1.0, 0.0, 0.0
degrees = 0
resolution = snap
make leftShoulder
axis = 1.0, 0.0, 0.0
make rightShoulder

// Two Arms
parent leftShoulder
resolution = flerp
colour = CSS:rgb(193, 161, 112)
axis = -1.0, -2.0, -1.0
degrees = 30
length = 0.6
make leftArm
parent rightShoulder
axis = 1.0, -2.0, -1.0
make rightArm

// Torso
parent neck
colour = CSS:rgb(33, 79, 50)
width = 0.3
length = 0.7
axis = 0.0, -1.0, 0.0
degrees = 10
resolution = snap
make torso

// Two hips
parent torso
width = 0.2
length = 0.2
axis = -1.0, 0.0, 0.0
degrees = 0
make leftHip
axis = 1.0, 0.0, 0.0
make rightHip

// Two upper legs
parent leftHip
resolution = flerp
colour = CSS:rgb(112, 125, 193)
degrees = 40
axis = -0.1, -1.0, -1.0
length = 0.4
make leftLeg
parent rightHip
axis = 0.1, -1.0, -1.0
make rightLeg

// Two lower legs
parent leftLeg
resolution = snap
degrees = 10
axis = 0.0, -1.0, 0.4
length = 0.4
make leftLowerLeg
parent rightLeg
make rightLowerLeg

exflerp leftArm rightArm
exflerp leftLeg rightLeg
`;
