import { describe, expect, it } from "vitest";
import {
  montarIdentidade,
  nomeAmigavel,
  detectarMelhoria,
  textoConfirmacaoMelhoria,
} from "@/modules/assistant/identity";
import { contarAcertos, agregarRanking, type PalpitePlacar } from "@/modules/assistant/scores";

describe("assistant/identity", () => {
  it("montarIdentidade inclui o nome do usuário e a identidade da 11", () => {
    const prompt = montarIdentidade("Vitor");
    expect(prompt).toContain("a 11");
    expect(prompt).toContain("Vitor");
    expect(prompt).toContain("Central de Melhorias");
    expect(prompt).toContain('"type":"melhoria"');
  });

  it("nomeAmigável usa metadata.nome, depois nome, depois e-mail", () => {
    expect(
      nomeAmigavel({ email: "x@y.z", user_metadata: { nome: "Giovanna" } })
    ).toBe("Giovanna");
    expect(
      nomeAmigavel({ email: "x@y.z", user_metadata: { name: "Ana" } })
    ).toBe("Ana");
    expect(nomeAmigavel({ email: "vitorvinhal90@gmail.com", user_metadata: null })).toBe(
      "Vitorvinhal90"
    );
    expect(nomeAmigavel(null)).toBe("visitante");
  });

  it("detectarMelhoria aceita JSON válido de melhoria", () => {
    const json = JSON.stringify({
      type: "melhoria",
      feedback: "o botão está pequeno",
      prompt_tecnico: "Aumentar o botão para h-12 em Button...",
    });
    const r = detectarMelhoria(json);
    expect(r).not.toBeNull();
    expect(r?.feedback).toBe("o botão está pequeno");
    expect(r?.promptTecnico).toContain("h-12");
  });

  it("detectarMelhoria rejeita texto normal, JSON inválido e JSON de outro tipo", () => {
    expect(detectarMelhoria("Quero que o botão fique maior")).toBeNull();
    expect(detectarMelhoria("{not json")).toBeNull();
    expect(
      detectarMelhoria(JSON.stringify({ type: "outro", feedback: "x", prompt_tecnico: "y" }))
    ).toBeNull();
    expect(detectarMelhoria(JSON.stringify({ type: "melhoria", feedback: "", prompt_tecnico: "y" }))).toBeNull();
    expect(detectarMelhoria(JSON.stringify({ type: "melhoria", feedback: "x", prompt_tecnico: "" }))).toBeNull();
  });

  it("textoConfirmacaoMelhoria cita o nome do usuário", () => {
    expect(textoConfirmacaoMelhoria("Giovanna")).toContain("Giovanna");
    expect(textoConfirmacaoMelhoria("Giovanna")).toContain("Central de Melhorias");
  });
});

describe("assistant/scores", () => {
  it("contarAcertos conta interseção sem duplicar", () => {
    expect(contarAcertos([4, 8, 15, 16, 23, 42], [4, 8, 15, 16, 23, 42])).toBe(6);
    expect(contarAcertos([1, 2, 3], [4, 5, 6])).toBe(0);
    expect(contarAcertos([1, 2, 3, 4], [4, 4, 5])).toBe(1);
    expect(contarAcertos([10, 20], [1, 20, 10, 30])).toBe(2);
  });

  it("agregarRanking soma acertos e ordena por total, depois melhor, depois palpites", () => {
    const base = {
      game_type: "megasena",
      numbers: [1, 2, 3],
      contest_number: 100,
      created_at: "2026-01-01T00:00:00Z",
    };
    const palpites: PalpitePlacar[] = [
      { ...base, id: "1", user_name: "Vitor", hits: 3 },
      { ...base, id: "2", user_name: "Vitor", hits: 2, created_at: "2026-01-02T00:00:00Z" },
      { ...base, id: "3", user_name: "Giovanna", hits: 4 },
      { ...base, id: "4", user_name: "Giovanna", hits: 1 },
      { ...base, id: "5", user_name: "11", hits: null },
    ];
    const ranking = agregarRanking(palpites);
    expect(ranking[0].user_name).toBe("Giovanna");
    expect(ranking[0].total_acertos).toBe(5);
    expect(ranking[0].total_palpites).toBe(2);
    expect(ranking[0].melhor_acerto).toBe(4);
    expect(ranking[1].user_name).toBe("Vitor");
    expect(ranking[1].total_acertos).toBe(5);
    expect(ranking[1].melhor_acerto).toBe(3);
    const ult = ranking[ranking.length - 1];
    expect(ult.user_name).toBe("11");
    expect(ult.total_acertos).toBe(0);
    expect(ult.ultimo_palpite_em).toBe("2026-01-01T00:00:00Z");
  });

  it("agregarRanking com lista vazia devolve array vazio", () => {
    expect(agregarRanking([])).toEqual([]);
  });
});
