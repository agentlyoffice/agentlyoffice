"use client";

import { useState } from "react";
import { Face } from "@/components/office/Face";
import { Modal } from "@/components/office/Modal";
import type { Me } from "@/components/office/AgencyProvider";
import { BRAND } from "@/config/brand";
import { DEFAULT_LOOK, EYES, HAIRS, HAIR_COLORS, HATS, PANTS, SHOES, SKINS, TOPS, TOP_COLORS, randomLook, type Look } from "@/lib/office/look";
import type { Dir } from "@/lib/office/map";

const TURN: Dir[] = ["down", "left", "up", "right"];

function Swatches({ label, colors, value, onPick }: { label: string; colors: readonly string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="mrow">
      <span className="mlbl">{label}</span>
      <div className="mopts" role="radiogroup" aria-label={label}>
        {colors.map((c, i) => (
          <button key={c} type="button" role="radio" aria-checked={value === i} aria-label={`${label} ${i + 1}`} className={`swc ${value === i ? "on" : ""}`} style={{ background: c }} onClick={() => onPick(i)} />
        ))}
      </div>
    </div>
  );
}

function Words<T extends string>({ label, items, value, onPick }: { label: string; items: readonly T[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="mrow">
      <span className="mlbl">{label}</span>
      <div className="mopts" role="radiogroup" aria-label={label}>
        {items.map((it) => (
          <button key={it} type="button" role="radio" aria-checked={value === it} className={`swt ${value === it ? "on" : ""}`} onClick={() => onPick(it)}>
            {it}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "Who are you?": the visitor's name and pixel look, kept in this browser. */
export function WhoDialog({ me, onSave, onClose, first }: { me: Me | null; onSave: (m: Me) => void; onClose: () => void; first: boolean }) {
  const [look, setLook] = useState<Look>(me?.look ?? DEFAULT_LOOK);
  const [name, setName] = useState(me?.name ?? "");
  const [turn, setTurn] = useState(0);
  const [err, setErr] = useState("");
  const set = <K extends keyof Look>(k: K, v: Look[K]) => setLook((l) => ({ ...l, [k]: v }));
  const save = () => {
    const n = name.trim();
    if (n.length < 2 || n.length > 16) return setErr("Names are 2 to 16 characters long.");
    onSave({ name: n, look });
  };
  return (
    <Modal
      title="Who are you?"
      wide
      closable={!first}
      onClose={onClose}
      testid="who-dialog"
      pre={
        first ? (
          <p className="who-kicker">
            {BRAND.name} · {BRAND.slogan}
          </p>
        ) : null
      }
      sub={
        <>
          You walk the office as a visitor. The four agents carry the office badge; you hand them work and make the final call. Your look and name stay in this browser.
        </>
      }
    >
      <div className="maker">
        <div className="maker-left">
          <div className="stagebox">
            <Face look={look} dir={TURN[turn]} label="Preview of your visitor" />
          </div>
          <div className="turn">
            <button type="button" className="round" aria-label="Turn left" onClick={() => setTurn((t) => (t + 3) % 4)}>
              ‹
            </button>
            <span>Turn</span>
            <button type="button" className="round" aria-label="Turn right" onClick={() => setTurn((t) => (t + 1) % 4)}>
              ›
            </button>
          </div>
        </div>
        <div>
          <label className="lbl" htmlFor="who-name">
            Your name
          </label>
          <input id="who-name" className="input" placeholder="2 to 16 characters" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} data-testid="who-name" />
          <Swatches label="Skin" colors={SKINS} value={look.skin} onPick={(i) => set("skin", i)} />
          <Words label="Hair" items={HAIRS} value={look.hair} onPick={(v) => set("hair", v)} />
          <Swatches label="Hair colour" colors={HAIR_COLORS} value={look.hairColor} onPick={(i) => set("hairColor", i)} />
          <Words label="Top" items={TOPS} value={look.top} onPick={(v) => set("top", v)} />
          <Swatches label="Colour" colors={TOP_COLORS} value={look.topColor} onPick={(i) => set("topColor", i)} />
          <Swatches label="Pants" colors={PANTS} value={look.pants} onPick={(i) => set("pants", i)} />
          <Swatches label="Shoes" colors={SHOES} value={look.shoes} onPick={(i) => set("shoes", i)} />
          <Words label="Hat" items={HATS} value={look.hat} onPick={(v) => set("hat", v)} />
          <Words label="Eyes" items={EYES} value={look.eyes} onPick={(v) => set("eyes", v)} />
        </div>
      </div>
      <div className="modal-foot">
        <button type="button" className="btn btn-cream" onClick={() => setLook(randomLook())}>
          Surprise me
        </button>
        {err ? (
          <span className="err bad" role="alert">
            {err}
          </span>
        ) : null}
        <button type="button" className="btn btn-orange" onClick={save} data-testid="who-enter">
          {first ? "Enter the office" : "Save"}
        </button>
      </div>
    </Modal>
  );
}
