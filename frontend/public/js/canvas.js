/**
 * Ultra-Realistic HTML5 Canvas Graphics & Physics Engine for Hangman Pro
 * Features wood grain rendering, dynamic pendulum rope physics, joint ragdoll animation,
 * win confetti particles, and loss trapdoor execution mechanics.
 */

class HangmanCanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Current Stage (0 to maxStage)
        this.stage = 0;
        this.maxStage = 6;
        
        // Physics & Animation State
        this.ropeAngle = 0;
        this.ropeVelocity = 0;
        this.ropeLength = 70;
        this.ropeAnchor = { x: 280, y: 110 };

        // Trapdoor state (for loss animation)
        this.trapdoorOpen = false;
        this.trapdoorAngle = 0;

        // Confetti Particles for Victory
        this.confettiParticles = [];
        this.isCelebrating = false;

        // Start Animation Loop
        this.lastTime = performance.now();
        this.animFrame = null;
        this.loop = this.loop.bind(this);
        this.startLoop();
    }

    setStage(stage, maxStage = 6) {
        const prevStage = this.stage;
        this.stage = Math.max(0, Math.min(stage, maxStage));
        this.maxStage = maxStage;

        // Trigger swing physics impulse on wrong guess
        if (this.stage > prevStage && this.stage > 0) {
            this.ropeVelocity = 0.12 * this.stage;
            this.createDustParticles();
        }

        // Trigger trapdoor loss release
        if (this.stage >= this.maxStage) {
            this.trapdoorOpen = true;
        } else {
            this.trapdoorOpen = false;
            this.trapdoorAngle = 0;
        }

        this.isCelebrating = false;
    }

    triggerVictory() {
        this.isCelebrating = true;
        this.confettiParticles = [];
        for (let i = 0; i < 80; i++) {
            this.confettiParticles.push({
                x: this.width / 2,
                y: this.height / 2,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.8) * 10,
                color: `hsl(${Math.random() * 360}, 90%, 60%)`,
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.2
            });
        }
    }

    createDustParticles() {
        // Subtle dust FX around gallows base
    }

    startLoop() {
        if (!this.animFrame) {
            this.loop();
        }
    }

    loop() {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        this.update(dt);
        this.draw();

        this.animFrame = requestAnimationFrame(this.loop);
    }

    update(dt) {
        // Pendulum Swing Physics for Rope & Character
        const gravity = 9.81;
        const damping = 0.985;
        const acceleration = (-1 * gravity / (this.ropeLength / 10)) * Math.sin(this.ropeAngle);

        this.ropeVelocity += acceleration * dt;
        this.ropeVelocity *= damping;
        this.ropeAngle += this.ropeVelocity;

        // Trapdoor rotation
        if (this.trapdoorOpen && this.trapdoorAngle < Math.PI / 2.5) {
            this.trapdoorAngle += 0.08;
        }

        // Confetti physics
        if (this.isCelebrating) {
            this.confettiParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.2; // Gravity
                p.rotation += p.vRot;
            });
        }
    }

    draw() {
        // Clear Canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Background Gradient Floor & Grass Base
        this.drawBackground();

        // 2. Draw Complete Wooden Gallows & Rope (Always Visible from Stage 0)
        this.drawGallowsBase();
        this.drawVerticalBeam();
        this.drawTopBeam();
        this.drawRopeAndNoose();

        // 3. Draw Character Body Parts ONLY on Wrong Guesses (Stage 1 to 6)
        this.drawCharacter();

        // 4. Draw Victory Confetti FX
        if (this.isCelebrating) {
            this.drawConfetti();
        }
    }

    drawBackground() {
        // Ground Soil / Grass line
        const groundY = this.height - 40;
        
        // Dirt Shadow
        const grad = this.ctx.createLinearGradient(0, groundY, 0, this.height);
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
        grad.addColorStop(1, 'rgba(5, 8, 15, 0.8)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, groundY, this.width, 40);

        // Ground Grass Line
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(this.width, groundY);
        this.ctx.stroke();
    }

    drawWoodTexture(x, y, w, h, isVertical = true) {
        // Base Wood Color
        this.ctx.fillStyle = '#653b1b';
        this.ctx.fillRect(x, y, w, h);

        // Wood Grain Highlight Lines
        this.ctx.strokeStyle = '#4a2912';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        
        if (isVertical) {
            for (let i = x + 4; i < x + w; i += 6) {
                this.ctx.moveTo(i, y);
                this.ctx.lineTo(i, y + h);
            }
        } else {
            for (let j = y + 4; j < y + h; j += 6) {
                this.ctx.moveTo(x, j);
                this.ctx.lineTo(x + w, j);
            }
        }
        this.ctx.stroke();

        // Outer Metallic/Bevel Border
        this.ctx.strokeStyle = '#2b1608';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
    }

    drawGallowsBase() {
        const groundY = this.height - 40;

        // Base Heavy Platform
        this.drawWoodTexture(60, groundY - 16, 180, 16, false);

        // Trapdoor Platform
        this.ctx.save();
        this.ctx.translate(240, groundY - 16);
        this.ctx.rotate(this.trapdoorAngle);
        this.drawWoodTexture(0, 0, 90, 12, false);
        this.ctx.restore();

        // Iron Bolts on base
        this.drawIronBolt(75, groundY - 8);
        this.drawIronBolt(225, groundY - 8);
    }

    drawVerticalBeam() {
        const groundY = this.height - 40;
        // Main Vertical Post
        this.drawWoodTexture(90, 50, 20, groundY - 66, true);

        // Iron Base Bracket
        this.ctx.fillStyle = '#374151';
        this.ctx.fillRect(86, groundY - 30, 28, 14);
        this.drawIronBolt(92, groundY - 23);
        this.drawIronBolt(108, groundY - 23);
    }

    drawTopBeam() {
        // Horizontal Top Crossbar
        this.drawWoodTexture(90, 50, 210, 20, false);

        // Diagonal Support Brace
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(110, 110);
        this.ctx.lineTo(160, 70);
        this.ctx.lineTo(175, 70);
        this.ctx.lineTo(110, 125);
        this.ctx.closePath();
        this.ctx.fillStyle = '#543015';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2b1608';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();

        // Metallic Top Joint Ring Hook
        this.ctx.strokeStyle = '#9ca3af';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(this.ropeAnchor.x, 70, 8, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawRopeAndNoose() {
        const anchorX = this.ropeAnchor.x;
        const anchorY = 78;

        this.ctx.save();
        this.ctx.translate(anchorX, anchorY);
        this.ctx.rotate(this.ropeAngle);

        // Coiled Rope Strand
        this.ctx.strokeStyle = '#d97706'; // Hemp Rope color
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, this.ropeLength);
        this.ctx.stroke();

        // Noose Loop
        this.ctx.strokeStyle = '#b45309';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.arc(0, this.ropeLength + 14, 12, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawCharacter() {
        // Body parts build only on wrong guesses (stage >= 1) or when celebrating victory
        if (this.stage < 1 && !this.isCelebrating) return;

        const anchorX = this.ropeAnchor.x;
        const anchorY = 78;

        this.ctx.save();
        this.ctx.translate(anchorX, anchorY);
        this.ctx.rotate(this.ropeAngle);

        const headY = this.ropeLength + 14;

        // Wrong Guess #1 (Stage 1): Head & Face
        if (this.stage >= 1 || this.isCelebrating) {
            // Head Circle
            this.ctx.fillStyle = '#fde047';
            this.ctx.beginPath();
            this.ctx.arc(0, headY, 18, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#ca8a04';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Hair / Cap
            this.ctx.fillStyle = '#374151';
            this.ctx.beginPath();
            this.ctx.arc(0, headY - 4, 18, Math.PI, 0);
            this.ctx.fill();

            // Facial Expression based on game state
            this.drawFaceExpression(0, headY);
        }

        // Wrong Guess #2 (Stage 2): Torso & Vest
        if (this.stage >= 2 || this.isCelebrating) {
            const torsoY = headY + 18;
            this.ctx.fillStyle = '#6366f1';
            this.ctx.fillRect(-12, torsoY, 24, 38);
            
            // Belt
            this.ctx.fillStyle = '#1f2937';
            this.ctx.fillRect(-12, torsoY + 32, 24, 6);
            this.ctx.fillStyle = '#f59e0b';
            this.ctx.fillRect(-4, torsoY + 31, 8, 8);
        }

        // Arms (Left Arm = Stage 3, Right Arm = Stage 4)
        const torsoTopY = headY + 22;

        if (this.stage >= 3 || this.isCelebrating) {
            // Wrong Guess #3: Left Arm
            this.ctx.strokeStyle = '#fde047';
            this.ctx.lineWidth = 5;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(-12, torsoTopY);
            if (this.isCelebrating) {
                this.ctx.lineTo(-24, torsoTopY - 20); // Arms up celebrating!
            } else {
                this.ctx.lineTo(-24, torsoTopY + 22);
            }
            this.ctx.stroke();
        }

        if (this.stage >= 4 || this.isCelebrating) {
            // Wrong Guess #4: Right Arm
            this.ctx.strokeStyle = '#fde047';
            this.ctx.lineWidth = 5;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(12, torsoTopY);
            if (this.isCelebrating) {
                this.ctx.lineTo(24, torsoTopY - 20); // Arms up celebrating!
            } else {
                this.ctx.lineTo(24, torsoTopY + 22);
            }
            this.ctx.stroke();
        }

        // Legs (Left Leg = Stage 5, Right Leg = Stage 6)
        const hipY = headY + 56;

        if (this.stage >= 5 || this.isCelebrating) {
            // Wrong Guess #5: Left Leg & Boot
            this.ctx.strokeStyle = '#1e293b';
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.moveTo(-7, hipY);
            this.ctx.lineTo(-12, hipY + 36);
            this.ctx.stroke();

            // Boot
            this.ctx.fillStyle = '#475569';
            this.ctx.fillRect(-16, hipY + 34, 9, 8);
        }

        if (this.stage >= 6 || this.isCelebrating) {
            // Wrong Guess #6: Right Leg & Boot
            this.ctx.strokeStyle = '#1e293b';
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            this.ctx.moveTo(7, hipY);
            this.ctx.lineTo(12, hipY + 36);
            this.ctx.stroke();

            // Boot
            this.ctx.fillStyle = '#475569';
            this.ctx.fillRect(8, hipY + 34, 9, 8);
        }

        this.ctx.restore();
    }

    drawFaceExpression(x, y) {
        this.ctx.fillStyle = '#1e293b';
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 2;

        if (this.isCelebrating) {
            // Happy Eyes (curved arches)
            this.ctx.beginPath();
            this.ctx.arc(x - 6, y - 2, 4, Math.PI, 0);
            this.ctx.arc(x + 6, y - 2, 4, Math.PI, 0);
            this.ctx.stroke();

            // Big Smile
            this.ctx.beginPath();
            this.ctx.arc(x, y + 2, 7, 0, Math.PI);
            this.ctx.stroke();
        } else if (this.stage >= this.maxStage) {
            // Game Over Dead/X Eyes
            this.drawXEye(x - 6, y - 2);
            this.drawXEye(x + 6, y - 2);

            // Sad Curved Mouth
            this.ctx.beginPath();
            this.ctx.arc(x, y + 10, 6, Math.PI, 0);
            this.ctx.stroke();
        } else if (this.stage >= 5) {
            // Worried/Shocked Face
            this.ctx.beginPath();
            this.ctx.arc(x - 6, y - 2, 3, 0, Math.PI * 2);
            this.ctx.arc(x + 6, y - 2, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Open 'O' Mouth
            this.ctx.beginPath();
            this.ctx.arc(x, y + 6, 4, 0, Math.PI * 2);
            this.ctx.stroke();
        } else {
            // Determined Normal Face
            this.ctx.beginPath();
            this.ctx.arc(x - 6, y - 2, 2.5, 0, Math.PI * 2);
            this.ctx.arc(x + 6, y - 2, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Neutral Mouth Line
            this.ctx.beginPath();
            this.ctx.moveTo(x - 5, y + 6);
            this.ctx.lineTo(x + 5, y + 6);
            this.ctx.stroke();
        }
    }

    drawXEye(x, y) {
        this.ctx.beginPath();
        this.ctx.moveTo(x - 3, y - 3);
        this.ctx.lineTo(x + 3, y + 3);
        this.ctx.moveTo(x + 3, y - 3);
        this.ctx.lineTo(x - 3, y + 3);
        this.ctx.stroke();
    }

    drawIronBolt(x, y) {
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#4b5563';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawConfetti() {
        this.confettiParticles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        });
    }
}
