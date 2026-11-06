package co.antesdeabrir.piloto;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Small, offline-testable helper for comparing consented Family red-risk domains.
 * This is context only; it does not classify a destination as malicious.
 */
final class FamilyDomainMatch {
    private FamilyDomainMatch() { }
    private static final Set<String> CONTEXT = new HashSet<>(java.util.Arrays.asList(
        "acceso", "actualiza", "alerta", "cuenta", "login", "pago", "promo", "seguro", "soporte",
        "update", "verifica", "verificacion", "verify"));

    static String compare(String current, String reported) {
        if (current == null || reported == null) return "";
        String a = current.trim().toLowerCase(Locale.ROOT);
        String b = reported.trim().toLowerCase(Locale.ROOT);
        if (!a.matches("[a-z0-9-]+(\\.[a-z0-9-]+)+") || !b.matches("[a-z0-9-]+(\\.[a-z0-9-]+)+")) return "";
        if (a.equals(b)) return "same-domain";
        // Avoid calling wholly different registrable domains similar on a weak name match.
        int ax = a.lastIndexOf('.'), bx = b.lastIndexOf('.');
        if (!a.substring(ax).equals(b.substring(bx))) return "";
        String left = a.substring(0, ax), right = b.substring(0, bx);
        if (left.length() < 5 || right.length() < 5) return "";
        for (String l : roots(left)) for (String r : roots(right)) {
            if (l.length() < 5 || r.length() < 5) continue;
            for (String variant : variants(l)) {
                if (variants(r).contains(variant)) return "similar-domain";
            }
            // A single typo in sufficiently distinctive names is a possible similarity, not a verdict.
            if (l.length() >= 8 && r.length() >= 8 && oneEdit(l, r)) return "similar-domain";
        }
        return "";
    }
    private static Set<String> roots(String token) {
        Set<String> roots = new HashSet<>(); roots.add(token);
        String[] words=token.split("-");
        if (words.length==2) {
            if(CONTEXT.contains(words[0])) roots.add(words[1]);
            if(CONTEXT.contains(words[1])) roots.add(words[0]);
        }
        return roots;
    }
    private static Set<String> variants(String token) {
        Set<String> result = new HashSet<>();
        String basic=token.replace('0','o').replace('3','e').replace('4','a').replace('5','s').replace('7','t')
            .replace("rn","m").replace("vv","w");
        result.add(basic);
        if(basic.chars().filter(c->c=='1').count() > 2) return result;
        for(char c: basic.toCharArray()) if(c=='1') {
            Set<String> next = new HashSet<>();
            for(String part:result){next.add(part.replaceFirst("1","l"));next.add(part.replaceFirst("1","i"));}
            result=next;
        }
        return result;
    }
    private static boolean oneEdit(String a,String b) {
        if(Math.abs(a.length()-b.length())>1) return false;
        int i=0,j=0,n=0;
        while(i<a.length()&&j<b.length()) {
            if(a.charAt(i)==b.charAt(j)){i++;j++;continue;}
            if(++n>1) return false;
            if(a.length()>=b.length()) i++;
            if(a.length()<=b.length()) j++;
        }
        return n+(a.length()-i)+(b.length()-j)<=1;
    }
}
