// Zemberek (Apache 2.0, github.com/ahmetaa/zemberek-nlp) için kalıcı çalışan köprü: server.py stdin'e komut yazar, stdout'tan tek satır JSON okur.
//   A<TAB>sözcük   -> tek sözcük çözümlemeleri
//   S<TAB>cümle    -> cümle çözümleme + morfolojik belirsizlik giderme (perceptron)
//   I<TAB>lemma    -> sözlükteki maddeler (lemma, tür, id)
//   G<TAB>lemma<TAB>tür<TAB>id,id,...  -> kökten ekleri sırayla ekleyerek sözcük üretir (WordGenerator)
//   O<TAB>lemma<TAB>tür<TAB>id,id,...  -> bu zincirden sonra eklenebilen ekler ve ürettikleri biçimler
// Her yanıt "@@" önekiyle başlar; kütüphanenin yazdığı her şey stderr'e yönlendirilir.
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import zemberek.morphology.TurkishMorphology;
import zemberek.morphology.analysis.*;
import zemberek.morphology.generator.WordGenerator;
import zemberek.morphology.lexicon.DictionaryItem;

public class ZemberekBridge {
    static String q(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default: if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
            }
        }
        return b.append('"').toString();
    }

    static String one(SingleAnalysis a) {
        StringBuilder m = new StringBuilder("[");
        boolean first = true;
        for (SingleAnalysis.MorphemeData d : a.getMorphemeDataList()) {
            if (!first) m.append(',');
            first = false;
            m.append("{\"id\":").append(q(d.morpheme.id)).append(",\"name\":").append(q(d.morpheme.name))
             .append(",\"surface\":").append(q(d.surface)).append(",\"deriv\":").append(d.morpheme.derivational).append('}');
        }
        m.append(']');
        return "{\"lexical\":" + q(a.formatLexical()) + ",\"long\":" + q(a.formatLong())
            + ",\"oflazer\":" + q(AnalysisFormatters.OFLAZER_STYLE.format(a))
            + ",\"stem\":" + q(a.getStem()) + ",\"ending\":" + q(a.getEnding())
            + ",\"lemma\":" + q(a.getDictionaryItem().lemma) + ",\"pos\":" + q(String.valueOf(a.getPos()))
            + ",\"unknown\":" + a.isUnknown() + ",\"morphemes\":" + m + "}";
    }

    static String word(WordAnalysis w) {
        StringBuilder b = new StringBuilder("[");
        boolean first = true;
        for (SingleAnalysis a : w) { if (!first) b.append(','); first = false; b.append(one(a)); }
        return b.append(']').toString();
    }

    static final String[] CANDS = {"A3pl", "P1sg", "P2sg", "P3sg", "P1pl", "P2pl", "P3pl", "Gen", "Acc", "Dat", "Loc", "Abl", "Ins", "Equ", "Rel", "Dim", "Ness", "With", "Without", "Agt", "Become", "Acquire",
        "Caus", "Pass", "Reflex", "Recip", "Able", "Neg", "Aor", "Prog1", "Prog2", "Past", "Narr", "Fut", "Cond", "Imp", "Opt", "Neces", "Desr", "Cop", "A1sg", "A2sg", "A1pl", "A2pl", "Inf1", "Inf2", "Inf3",
        "PastPart", "PresPart", "FutPart", "AorPart", "NarrPart", "AfterDoing", "ByDoingSo", "When", "While", "Ly"};

    static String itemJson(DictionaryItem d) {
        return "{\"lemma\":" + q(d.lemma) + ",\"pos\":" + q(String.valueOf(d.primaryPos)) + ",\"id\":" + q(d.id) + "}";
    }

    static DictionaryItem find(TurkishMorphology m, String lemma, String pos) {
        java.util.List<DictionaryItem> l = m.getLexicon().getMatchingItems(lemma);
        if (l.isEmpty()) {                       // fiil maddeleri mastarla kayıtlıdır: gel -> gelmek
            l = m.getLexicon().getMatchingItems(lemma + "mek");
            if (l.isEmpty()) l = m.getLexicon().getMatchingItems(lemma + "mak");
        }
        if (l.isEmpty()) return null;
        for (DictionaryItem d : l) if (!pos.isEmpty() && String.valueOf(d.primaryPos).toLowerCase().startsWith(pos.toLowerCase())) return d;
        return l.get(0);
    }

    static String gen(WordGenerator g, DictionaryItem d, java.util.List<String> ids) {
        StringBuilder b = new StringBuilder("[");
        boolean first = true;
        try {
            for (WordGenerator.Result r : g.generate(d, ids.toArray(new String[0]))) {
                if (!first) b.append(',');
                first = false;
                b.append("{\"surface\":").append(q(r.surface)).append(",\"analysis\":").append(one(r.analysis)).append('}');
            }
        } catch (Throwable ex) { /* geçersiz ek kimliği ya da geçersiz zincir: boş sonuç */ }
        return b.append(']').toString();
    }

    public static void main(String[] args) throws Exception {
        PrintStream out = new PrintStream(new FileOutputStream(FileDescriptor.out), true, "UTF-8");
        System.setOut(System.err);
        TurkishMorphology morph = TurkishMorphology.createWithDefaults();
        out.println("@@READY");
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        String line;
        while ((line = in.readLine()) != null) {
            int t = line.indexOf('\t');
            String cmd = t < 0 ? line : line.substring(0, t), arg = t < 0 ? "" : line.substring(t + 1);
            try {
                if (cmd.equals("A")) {
                    out.println("@@{\"input\":" + q(arg) + ",\"analyses\":" + word(morph.analyze(arg)) + "}");
                } else if (cmd.equals("S")) {
                    SentenceAnalysis s = morph.analyzeAndDisambiguate(arg);
                    StringBuilder b = new StringBuilder("@@{\"sentence\":" + q(arg) + ",\"words\":[");
                    boolean first = true;
                    for (SentenceWordAnalysis e : s) {
                        if (!first) b.append(',');
                        first = false;
                        b.append("{\"input\":").append(q(e.getWordAnalysis().getInput())).append(",\"best\":").append(one(e.getBestAnalysis()))
                         .append(",\"all\":").append(word(e.getWordAnalysis())).append('}');
                    }
                    out.println(b.append("]}"));
                } else if (cmd.equals("I")) {
                    StringBuilder b = new StringBuilder("@@{\"items\":[");
                    boolean first = true;
                    for (DictionaryItem d : morph.getLexicon().getMatchingItems(arg)) { if (!first) b.append(','); first = false; b.append(itemJson(d)); }
                    out.println(b.append("]}"));
                } else if (cmd.equals("G") || cmd.equals("O")) {
                    String[] p = arg.split("	", -1);
                    String lemma = p[0], pos = p.length > 1 ? p[1] : "", chain = p.length > 2 ? p[2] : "";
                    java.util.List<String> ids = chain.isEmpty() ? new java.util.ArrayList<>() : new java.util.ArrayList<>(java.util.Arrays.asList(chain.split(",")));
                    DictionaryItem d = find(morph, lemma, pos);
                    if (d == null) { out.println("@@{\"error\":\"sözlükte yok\"}"); continue; }
                    WordGenerator g = morph.getWordGenerator();
                    if (cmd.equals("G")) {
                        out.println("@@{\"item\":" + itemJson(d) + ",\"results\":" + gen(g, d, ids) + "}");
                    } else {
                        StringBuilder b = new StringBuilder("@@{\"item\":" + itemJson(d) + ",\"base\":" + gen(g, d, ids) + ",\"options\":[");
                        boolean first = true;
                        for (String c : CANDS) {
                            java.util.List<String> next = new java.util.ArrayList<>(ids); next.add(c);
                            String r = gen(g, d, next);
                            if (r.length() > 2) { if (!first) b.append(','); first = false; b.append("{\"id\":").append(q(c)).append(",\"results\":").append(r).append('}'); }
                        }
                        out.println(b.append("]}"));
                    }
                } else if (cmd.equals("Q")) {
                    break;
                } else {
                    out.println("@@{\"error\":" + q("unknown command") + "}");
                }
            } catch (Throwable ex) {
                out.println("@@{\"error\":" + q(String.valueOf(ex)) + "}");
            }
        }
    }
}
