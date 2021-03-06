import { EClasseRacine } from "../../../models/commun/constantes";
import { ContexteAnalyse } from "../../../models/compilateur/contexte-analyse";
import { Definition } from "../../../models/compilateur/definition";
import { Phrase } from "../../../models/compilateur/phrase";
import { ResultatAnalysePhrase } from "../../../models/compilateur/resultat-analyse-phrase";
import { MotUtils } from "../../commun/mot-utils";
import { PhraseUtils } from "../../commun/phrase-utils";
import { StringUtils } from "../../commun/string.utils";
import { ExprReg } from "../expr-reg";
import { AnalyseurUtils } from "./analyseur.utils";

export class AnalyseurType {

    /**
     * Nouveau type d’élément.
     * - Ex: Un fruit est un objet mangeable et périssable.
     * @param phrase 
     * @param ctxAnalyse 
     */
    public static testerNouveauType(phrase: Phrase, ctxAnalyse: ContexteAnalyse): ResultatAnalysePhrase {

        let elementTrouve: ResultatAnalysePhrase = ResultatAnalysePhrase.aucun;

        const result = ExprReg.xNouveauType.exec(phrase.phrase[0]);

        if (result !== null) {

            const determinant = result[1];
            const nouveauTypeIntitule = result[2];
            const nouveauTypeNom =StringUtils.normaliserMot(nouveauTypeIntitule);
            const typeParent = StringUtils.normaliserMot(result[3]);
            const attributsBruts = result[4];

            // retrouver les attributs éventuels
            let nouveauxAttributs: string[] = null;
            if (attributsBruts?.trim() !== '') {
                // découper les attributs
                nouveauxAttributs = PhraseUtils.separerListeIntitules(attributsBruts);
            }

            // vérifier si le type parent est déjà défini
            if (!ctxAnalyse.typesUtilisateur.has(typeParent)) {
                ctxAnalyse.erreurs.push();
            }

            // si le type est déjà défini
            if (ctxAnalyse.typesUtilisateur.has(nouveauTypeNom)) {

                let typeExistant = ctxAnalyse.typesUtilisateur.get(nouveauTypeNom);

                // garder dernier type parent défini
                typeExistant.typeParent = typeParent;

                // si type parent a déjà été précisé, ajouter une erreur
                if (typeExistant.typeParent !== EClasseRacine.objet) {
                    AnalyseurUtils.ajouterErreur(ctxAnalyse, phrase.ligne, "Le type parent de « " + typeExistant.intitule + " » a été défini plusieurs fois. Seul le plus récent sera conservé : « " + typeExistant.typeParent + " ».");
                }

                // ajouter les nouveaux attributs
                typeExistant.etats = typeExistant.etats.concat(nouveauxAttributs);

                // si le type n’est pas encore défini
            } else {
                ctxAnalyse.typesUtilisateur.set(nouveauTypeNom, new Definition(
                    nouveauTypeIntitule,
                    typeParent,
                    MotUtils.getNombre(determinant),
                    nouveauxAttributs
                ));
            }


            elementTrouve = ResultatAnalysePhrase.type;
        }

        return elementTrouve;
    }

    /**
     * Précision sur un type d’élément.
     * - Ex: Un fruit est un objet mangeable et périssable.
     * @param phrase 
     * @param ctxAnalyse 
     */
    public static testerPrecisionType(phrase: Phrase, ctxAnalyse: ContexteAnalyse): ResultatAnalysePhrase {

        let elementTrouve: ResultatAnalysePhrase = ResultatAnalysePhrase.aucun;

        const result = ExprReg.xPrecisionType.exec(phrase.phrase[0]);

        if (result !== null) {

            const determinant = result[1];
            const typeIntitule = result[2];
            const typeNom =StringUtils.normaliserMot(typeIntitule);
            const attributsBruts = result[3];

            // retrouver les attributs éventuels
            let nouveauxAttributs: string[] = null;
            if (attributsBruts?.trim() !== '') {
                // découper les attributs
                nouveauxAttributs = PhraseUtils.separerListeIntitules(attributsBruts);
            }

            // si le type est déjà défini
            if (ctxAnalyse.typesUtilisateur.has(typeNom)) {
                // ajouter les nouveaux attributs
                ctxAnalyse.typesUtilisateur.get(typeNom).etats = ctxAnalyse.typesUtilisateur.get(typeNom).etats.concat(nouveauxAttributs);

                // si le type n’est pas encore défini
            } else {
                ctxAnalyse.typesUtilisateur.set(typeNom, new Definition(
                    typeIntitule,
                    EClasseRacine.objet, // objet par défaut
                    MotUtils.getNombre(determinant),
                    nouveauxAttributs
                ));
            }

            elementTrouve = ResultatAnalysePhrase.precisionType;
        }

        return elementTrouve;
    }

}