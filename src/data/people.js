// English citizens: names, looks and body types. Pure data.
export const MALE = ['James', 'Oliver', 'George', 'Harry', 'Jack', 'Charlie', 'Thomas', 'William', 'Henry', 'Edward', 'Arthur', 'Alfie', 'Oscar', 'Freddie', 'Samuel', 'Joseph', 'Ben', 'Daniel', 'Callum', 'Liam', 'Rhys', 'Connor', 'Reggie', 'Stanley', 'Albert', 'Frank', 'Ronnie', 'Colin', 'Trevor', 'Graham', 'Nigel', 'Barry', 'Alan', 'Keith', 'Dennis', 'Archie', 'Theo', 'Leo', 'Jacob', 'Ryan'];
export const FEMALE = ['Olivia', 'Amelia', 'Emily', 'Isla', 'Ava', 'Mia', 'Grace', 'Florence', 'Poppy', 'Ivy', 'Charlotte', 'Evie', 'Sophie', 'Hannah', 'Lucy', 'Ruby', 'Alice', 'Edith', 'Margaret', 'Beryl', 'Doreen', 'Jessica', 'Megan', 'Holly', 'Tilly', 'Joan', 'Pauline', 'Susan', 'Karen', 'Sheila', 'Maureen', 'Daisy', 'Rosie', 'Lily', 'Molly', 'Freya', 'Phoebe', 'Elsie', 'Beatrice', 'Gemma'];
export const SURNAMES = ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Roberts', 'Johnson', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Harris', 'Lewis', 'Clarke', 'Baker', 'Cooper', 'Fletcher', 'Archer', 'Turner', 'Mason', 'Fisher', 'Hill', 'Ward', 'Bennett', 'Carter', 'Marsh', 'Pearce', 'Hargreaves', 'Ashworth', 'Whitaker', 'Holloway', 'Thornton', 'Garner', 'Pickering', 'Sutton', 'Bradshaw', 'Atkinson', 'Chapman', 'Dawson', 'Fox', 'Grant', 'Hartley', 'Kemp'];
// mostly pale/olive with some diversity, like a modern English town
export const SKINS = [0xf6d9c2, 0xf3d0b5, 0xefc7a8, 0xe8bd9a, 0xe0b48f, 0xd6a77f, 0xc68e63, 0xa87550, 0x8a5a3a, 0x6e4529];
export const HAIRS = [0x2a1d12, 0x3b2a1a, 0x4a3320, 0x6b4a2a, 0x8a5a2a, 0xc9a24a, 0xdcc07a, 0x7a2e1e, 0xa8431f, 0x151515];
export const GREY_HAIRS = [0xb9b9b9, 0xd8d8d8, 0x9a9a9a];
export const TOPS_M = [0x3f5f8f, 0x8a3b32, 0x4f6f4a, 0x7a6a4a, 0x5a5f69, 0x2f4f6a, 0xb8a27a, 0x6b4a3a, 0x9aa5ad, 0x445a3a];
export const TOPS_F = [0xc45a6a, 0x4f8f9a, 0xd9b34a, 0x8a5aa7, 0x5aa56b, 0xe07fa0, 0x3f6fae, 0xd9d4c4, 0xb8483a, 0x7a9ad0];
export const PANTS = [0x2d3340, 0x4a4036, 0x3a4a63, 0x222222, 0x5a5a5a, 0x4a3a2a, 0x2f3d2f];
export const TRAITS = ['cheerful', 'grumpy', 'shy', 'busy'];
// body types: sw=shoulder/torso width, td=torso depth, hip=hip width, lt=limb thickness, belly 0..1, h=height scale, w=girth scale
export const BUILDS = {
  slim:      { h: 1.0,  w: 0.9,  body: { sw: 0.92, td: 0.9, hip: 0.95, lt: 0.85, belly: 0 } },
  average:   { h: 1.0,  w: 1.0,  body: { sw: 1, td: 1, hip: 1, lt: 1, belly: 0 } },
  athletic:  { h: 1.03, w: 1.04, body: { sw: 1.14, td: 1.02, hip: 0.97, lt: 1.1, belly: 0 } },
  stocky:    { h: 0.96, w: 1.14, body: { sw: 1.08, td: 1.12, hip: 1.1, lt: 1.12, belly: 0.35 } },
  heavy:     { h: 0.97, w: 1.3,  body: { sw: 1.1, td: 1.25, hip: 1.2, lt: 1.2, belly: 1 } },
  tall:      { h: 1.13, w: 0.96, body: { sw: 0.98, td: 0.95, hip: 0.95, lt: 0.95, belly: 0 } },
  short:     { h: 0.87, w: 1.04, body: { sw: 1, td: 1.05, hip: 1.05, lt: 1.05, belly: 0.1 } },
  elderly:   { h: 0.94, w: 0.98, body: { sw: 0.92, td: 1.05, hip: 1.0, lt: 0.9, belly: 0.25 } },
  child:     { h: 0.62, w: 0.82, body: { sw: 0.9, td: 0.95, hip: 0.95, lt: 0.9, belly: 0, headS: 1.28 } },
};
export const ADULT_BUILD_WEIGHTS = [['average', 30], ['slim', 18], ['athletic', 10], ['stocky', 14], ['heavy', 10], ['tall', 10], ['short', 8]];
