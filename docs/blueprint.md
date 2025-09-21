# **App Name**: Atomic Canvas

## Core Features:

- Camera Stream: Display the user's live camera stream in full screen, providing a real-time background for the augmented reality experience.
- Hand Tracking: Implement hand tracking using MediaPipe Hands to detect and track hand landmarks, enabling interaction with the periodic table and molecule builder.
- Welcome Page: Design a simple and intuitive welcome page with instructions on how to use the app and a clear call to action to start the camera and hand tracking.
- AR Periodic Table: Superimpose an interactive periodic table at the bottom of the screen, allowing users to 'pick up' elements with their tracked hands.
- Element Information: When an element is selected, display detailed information about the atom, including its name, symbol, atomic number, and a 3D representation.
- Molecule Builder: Create a central workspace where users can drag and drop selected atoms to form molecules, visualizing the compound in 3D.
- Assisted Molecule Assembly: Suggest valid combinations, and provide a hint using a LLM tool if the user attempts to connect atoms in a manner inconsistent with the rules of chemistry.

## Style Guidelines:

- Primary color: Blue (#007BFF) to evoke a sense of clarity, scientific precision, and the natural world.
- Secondary color: Yellow (#FFC107) to draw attention to interactive elements and highlight important information.
- Background color: White (#FFFFFF) to provide a clean, neutral backdrop that doesn't distract from the camera feed and interactive elements.
- Text color: Black (#000000) for readability and contrast.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and short amounts of text, paired with 'Inter' (sans-serif) for body text.
- Use clean, simple icons to represent different elements and actions, ensuring they are easily recognizable against the camera background.
- Divide the screen into three main sections: full-screen camera view, interactive periodic table at the bottom, and molecule builder in the center. Maintain a balanced and intuitive arrangement.
- Implement smooth transitions and subtle animations when selecting elements, forming molecules, and displaying information to enhance the user experience.