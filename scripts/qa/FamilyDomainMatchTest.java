package co.antesdeabrir.piloto;

/** Stand-alone Java regression checks: run with javac and java, no device required. */
public final class FamilyDomainMatchTest {
    private static void check(String left,String right,String expected) {
        String actual=FamilyDomainMatch.compare(left,right);
        if(!expected.equals(actual)) throw new AssertionError(left+" / "+right+" => "+actual+" instead of "+expected);
    }
    public static void main(String[] args){
        check("netf1ix.com","netf1ix.com","same-domain");
        check("netf1ix.com","netflix.com","similar-domain");
        check("g00gle-login.com","google.com","similar-domain");
        check("paypa1.com","paypal.com","similar-domain");
        check("netflix.com","amazon.com","");
        check("paypal.com","paypal.net","");
        check("example.com","example.org","");
        check("example.com","evil.com","");
        check("bad domain.com","bad domain.com","");
        System.out.println("FamilyDomainMatch: 9 tests passed");
    }
}
