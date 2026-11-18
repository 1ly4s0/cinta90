import { byId, number } from './ui.js';
import { cover } from './frame.js';

export const suffix = 'cinta90';
export const acceptsImage = true;
export const acceptsAudio = false;
export const looks = [
    { noise: 44, tracking: 38, 'tape-color': 'warm', bleed: 24 },
    { noise: 22, tracking: 17, 'tape-color': 'cool', bleed: 14 },
    { noise: 81, tracking: 77, 'tape-color': 'warm', bleed: 66 }
];

const tape = document.createElement('canvas');
const video = tape.getContext('2d');

export function readSettings() {
    return {
        noise: number('noise') / 100,
        tracking: number('tracking') / 100,
        date: byId('stamp').value,
        color: byId('tape-color').value,
        bleed: number('bleed') / 100
    };
}

export function sizeFor(media) {
    if (!media) return { width: 800, height: 524 };
    const width = media.videoWidth || media.naturalWidth;
    const height = media.videoHeight || media.naturalHeight;
    const ratio = Math.min(1, 1280 / Math.max(width, height));
    return { width: Math.max(2, Math.round(width * ratio / 2) * 2), height: Math.max(2, Math.round(height * ratio / 2) * 2) };
}

function standby(drawing, width, height) {
    const sky = drawing.createLinearGradient(0, 0, width, height);
    sky.addColorStop(0, '#3d1624');
    sky.addColorStop(.48, '#351e45');
    sky.addColorStop(1, '#090b1a');
    drawing.fillStyle = sky;
    drawing.fillRect(0, 0, width, height);

    drawing.fillStyle = '#f39f82';
    drawing.beginPath();
    drawing.arc(width * .72, height * .37, height * .17, 0, Math.PI * 2);
    drawing.fill();
    for (let row = 0; row < 4; row++) {
        drawing.fillStyle = ['#693245', '#3e263e', '#221c33', '#171629'][row];
        drawing.beginPath();
        drawing.moveTo(0, height);
        for (let x = 0; x <= width; x += 10) {
            const elevation = Math.sin(x / width * 11 + row * 1.9) * .06 +
                Math.cos(x / width * 17 + row) * .035;
            drawing.lineTo(x, height * (.54 + row * .095 + elevation));
        }
        drawing.lineTo(width, height);
        drawing.fill();
    }
}

export function draw(drawing, media, settings, { width, height, time, comparison }) {
    // A lower-resolution copy softens the image before adding tape noise.
    const scale = Math.min(1, 540 / width);
    const columns = Math.max(2, Math.round(width * scale));
    const rows = Math.max(2, Math.round(height * scale));
    if (tape.width !== columns || tape.height !== rows) {
        tape.width = columns;
        tape.height = rows;
    }

    const filters = {
        warm: 'saturate(.85) contrast(1.12) sepia(.19)',
        cool: 'saturate(.72) contrast(1.2) hue-rotate(18deg)',
        mono: 'grayscale(1) contrast(1.18)'
    };
    video.filter = filters[settings.color];
    if (media) cover(video, media, columns, rows);
    else standby(video, columns, rows);
    video.filter = 'none';

    drawing.drawImage(tape, 0, 0, width, height);
    if (settings.bleed && settings.color !== 'mono') {
        const offset = Math.round(settings.bleed * width * .017);
        drawing.save();
        drawing.globalCompositeOperation = 'screen';
        drawing.globalAlpha = settings.bleed * .44;
        drawing.filter = 'hue-rotate(-40deg) saturate(2)';
        drawing.drawImage(tape, -offset, 0, width, height);
        drawing.filter = 'hue-rotate(44deg) saturate(2)';
        drawing.drawImage(tape, offset, 0, width, height);
        drawing.restore();
    }
    const wobble = Math.sin(time * 10.5) * 3 + 4;
    if (settings.tracking) {
        for (let index = 0; index < 5; index++) {
            const base = index === 0 ? .89 : ((.22 * index + time * (.05 + index * .02)) % 1);
            const top = Math.floor(base * rows);
            const bandHeight = Math.min(rows - top, Math.ceil(2 + settings.tracking * (index === 0 ? 24 : 5)));
            const shift = Math.round((wobble + index * 2) * settings.tracking * (index % 2 ? 1 : -1));
            drawing.drawImage(tape, 0, top, columns, bandHeight, shift, top / rows * height, width, bandHeight / rows * height);
        }
    }

    const grain = Math.round(settings.noise * 650);
    let seed = (Math.floor(time * 29) + 37) >>> 0;
    for (let index = 0; index < grain; index++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const x = seed % width;
        const y = (seed >>> 13) % height;
        drawing.fillStyle = index % 3 ? '#ffe9e33b' : '#140b2c66';
        drawing.fillRect(x, y, 1 + seed % 8, 1);
    }

    drawing.fillStyle = 'rgba(18, 8, 23,' + (.08 + settings.noise * .21) + ')';
    for (let y = 0; y < height; y += Math.max(3, Math.round(height / 170))) drawing.fillRect(0, y, width, 1);

    const vignette = drawing.createRadialGradient(width / 2, height / 2, height * .23, width / 2, height / 2, Math.hypot(width, height) * .53);
    vignette.addColorStop(0, '#10031e00');
    vignette.addColorStop(1, '#0e061ed1');
    drawing.fillStyle = vignette;
    drawing.fillRect(0, 0, width, height);

    if (settings.date) {
        const [year, month, day] = settings.date.split('-');
        const textSize = Math.max(9, Math.min(width, height) * .043);
        drawing.font = '600 ' + textSize + 'px monospace';
        drawing.fillStyle = '#fff1d3';
        drawing.shadowColor = '#1c122c';
        drawing.shadowBlur = 4;
        drawing.fillText(day + '.' + month + '.' + year, width * .06, height * .92);
        drawing.fillText('SP', width * .84, height * .13);
        drawing.shadowBlur = 0;
    }
    if (media && comparison > 0) {
        const edge = comparison * width;
        drawing.save();
        drawing.beginPath();
        drawing.rect(0, 0, edge, height);
        drawing.clip();
        cover(drawing, media, width, height);
        drawing.restore();
        if (comparison < 1) {
            drawing.fillStyle = '#fff2dc';
            drawing.fillRect(edge - 1, 0, 2, height);
        }
    }
}
