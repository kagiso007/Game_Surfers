export const W = 'w';
export const A = 'a';
export const S = 's';
export const D = 'd';
export const SHIFT = 'shift';
export const DIRECTIONS = [W, A, S, D];

export class KeyDisplay {
    constructor() {
        this.map = new Map();

        const w = document.createElement("div");
        const a = document.createElement("div");
        const s = document.createElement("div");
        const d = document.createElement("div");
        const shift = document.createElement("div");

        this.map.set(W, w);
        this.map.set(A, a);
        this.map.set(S, s);
        this.map.set(D, d);
        this.map.set(SHIFT, shift);

        // this.map.forEach((value, key) => {
        //     value.style.color = 'blue';
        //     value.style.fontSize = '50px';
        //     value.style.fontWeight = '800';
        //     value.style.position = 'absolute';
        //     value.textContent = key;
        // });

        // this.updatePosition();

        this.map.forEach((value, _) => {
            document.body.append(value);
        });
    }

    // updatePosition() {
    //     this.map.get(W).style.top = `${window.innerHeight - 150}px`;
    //     this.map.get(A).style.top = `${window.innerHeight - 100}px`;
    //     this.map.get(S).style.top = `${window.innerHeight - 100}px`;
    //     this.map.get(D).style.top = `${window.innerHeight - 100}px`;
    //     this.map.get(SHIFT).style.top = `${window.innerHeight - 100}px`;

    //     this.map.get(W).style.left = `${300}px`;
    //     this.map.get(A).style.left = `${200}px`;
    //     this.map.get(S).style.left = `${300}px`;
    //     this.map.get(D).style.left = `${400}px`;
    //     this.map.get(SHIFT).style.left = `${50}px`;
    // }

    keyPressed(key) {
        if (this.map.get(key.toLowerCase())) {
            this.map.get(key.toLowerCase()).style.color = 'red';
        }
    }

    keyNotPressed(key) {
        if (this.map.get(key.toLowerCase())) {
            this.map.get(key.toLowerCase()).style.color = 'blue';
        }
    }
}
