package com.nexawork.messaging.services;

import com.nexawork.messaging.entities.enums.MentionType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extraction des mentions du contenu d'un message (V5.1 §6.4). Ordre de parsing
 * obligatoire, du motif le plus long au plus court, pour éviter les faux positifs :
 * {@code @@@} DOCUMENT → {@code @@} TASK → {@code @} USER → {@code #} CHANNEL.
 *
 * <p>Cette classe extrait le <b>texte</b> mentionné ({@code targetText}) ; la
 * résolution vers l'identifiant réel ({@code targetId}) relève d'autres domaines
 * (User/Task/Document/Channel) et n'est pas effectuée ici (best-effort, §R16).</p>
 */
@Component
public class MentionParser {

    // Le token de mention s'arrête au premier espace (les libellés composés utilisent des tirets).
    private static final Pattern DOCUMENT = Pattern.compile("@@@([^\\s@#]+)");
    private static final Pattern TASK = Pattern.compile("@@([^\\s@#]+)");
    private static final Pattern USER = Pattern.compile("(?<![@])@([^\\s@#]+)");
    private static final Pattern CHANNEL = Pattern.compile("#([^\\s@#]+)");

    /** Une mention brute extraite : type + texte cible. */
    public record ParsedMention(MentionType type, String targetText) {
    }

    public List<ParsedMention> parse(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }
        List<ParsedMention> mentions = new ArrayList<>();
        // On masque progressivement les motifs déjà consommés pour respecter la priorité.
        String remaining = content;

        remaining = collect(remaining, DOCUMENT, MentionType.DOCUMENT, mentions);
        remaining = collect(remaining, TASK, MentionType.TASK, mentions);
        remaining = collect(remaining, USER, MentionType.USER, mentions);
        collect(remaining, CHANNEL, MentionType.CHANNEL, mentions);

        return mentions;
    }

    private String collect(String text, Pattern pattern, MentionType type, List<ParsedMention> out) {
        Matcher matcher = pattern.matcher(text);
        StringBuilder masked = new StringBuilder();
        while (matcher.find()) {
            out.add(new ParsedMention(type, matcher.group(1)));
            // Remplace le motif consommé par des espaces (même longueur) pour ne pas le re-matcher.
            matcher.appendReplacement(masked, " ".repeat(matcher.group().length()));
        }
        matcher.appendTail(masked);
        return masked.toString();
    }
}
