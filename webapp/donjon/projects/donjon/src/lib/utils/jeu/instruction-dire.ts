import { ConditionDebutee, StatutCondition, xFois } from "../../models/jouer/statut-conditions";
import { ELocalisation, Localisation } from "../../models/jeu/localisation";
import { PositionObjet, PrepositionSpatiale } from "../../models/jeu/position-objet";

import { ClasseUtils } from "../commun/classe-utils";
import { ConditionsUtils } from "./conditions-utils";
import { Conjugaison } from "./conjugaison";
import { EClasseRacine } from "../../models/commun/constantes";
import { ElementJeu } from "../../models/jeu/element-jeu";
import { ElementsJeuUtils } from "../commun/elements-jeu-utils";
import { Genre } from "../../models/commun/genre.enum";
import { Intitule } from "../../models/jeu/intitule";
import { Jeu } from "../../models/jeu/jeu";
import { Lieu } from "../../models/jeu/lieu";
import { Nombre } from "../../models/commun/nombre.enum";
import { Objet } from "../../models/jeu/objet";
import { PhraseUtils } from "../commun/phrase-utils";
import { Resultat } from "../../models/jouer/resultat";

export class InstructionDire {

    private cond: ConditionsUtils;

    constructor(
        private jeu: Jeu,
        private eju: ElementsJeuUtils,
        private verbeux: boolean,
    ) {
        this.cond = new ConditionsUtils(this.jeu, this.verbeux);
    }

    public interpreterContenuDire(contenu: string, nbExecutions: number, ceci: ElementJeu | Intitule = null, cela: ElementJeu | Intitule = null) {
        // A) 

        // ======================================================================================================
        // PROPRIÉTÉS [description|intitulé|intitule|singulier|pluriel|accord|es|e|s|pronom|Pronom|il|Il|l’|l'|le|lui ceci|cela|ici]
        // ======================================================================================================

        const balisePropriete = "(description|intitulé|intitule|singulier|pluriel|accord|es|s|e|pronom|Pronom|il|Il|l’|l'|le|lui) (ceci|cela|ici)";
        const xBaliseProprieteMulti = new RegExp("\\[" + balisePropriete + "\\]", "gi");
        const xBaliseProprieteSolo = new RegExp("\\[" + balisePropriete + "\\]", "i");

        if (xBaliseProprieteMulti.test(contenu)) {
            // retrouver toutes les balises de contenu [objets {sur|dans|sous} ceci|cela|ici|inventaire]
            const allBalises = contenu.match(xBaliseProprieteMulti);
            // ne garder qu’une seule occurence de chaque afin de ne pas calculer plusieurs fois la même balise.
            const balisesUniques = allBalises.filter((valeur, index, tableau) => tableau.indexOf(valeur) === index)
            // parcourir chaque balise trouvée
            balisesUniques.forEach(curBalise => {
                // retrouver la préposition et la cible
                const decoupe = xBaliseProprieteSolo.exec(curBalise);

                const proprieteString = decoupe[1];
                const cibleString = decoupe[2];
                const cible: ElementJeu = this.getCible(cibleString, ceci, cela);

                let resultat: string = '';

                switch (proprieteString) {
                    // > description
                    case 'description':
                    case 'Description':
                        resultat = this.calculerDescription(cible.description, ++cible.nbAffichageDescription, this.jeu.etats.possedeEtatIdElement(cible, this.jeu.etats.intactID), ceci, cela);
                        break;

                    case 'intitulé':
                    case 'intitule':
                        resultat = this.eju.calculerIntituleElement(cible, false, true);
                        break;

                    case 'Intitulé':
                    case 'Intitule':
                        resultat = this.eju.calculerIntituleElement(cible, true, true);
                        break;

                    case 'Singulier':
                        resultat = this.eju.calculerIntituleElement(cible, true, true, Nombre.s);
                        break;

                    case 'singulier':
                        resultat = this.eju.calculerIntituleElement(cible, false, true, Nombre.s);
                        break;

                    case 'Pluriel':
                        resultat = this.eju.calculerIntituleElement(cible, true, true, Nombre.p);
                        break;

                    case 'pluriel':
                        resultat = this.eju.calculerIntituleElement(cible, false, true, Nombre.p);
                        break;

                    // es ceci | accord ceci (féminin et pluriel)
                    case 'accord':
                    case 'es':
                        resultat = (cible.genre === Genre.f ? "e" : "") + (cible.nombre === Nombre.p ? "s" : "");
                        break;

                    // s ceci (pluriel)
                    case 's':
                        resultat = (cible.nombre === Nombre.p ? "s" : "");
                        break;

                    // e ceci (féminin)
                    case 'e':
                        resultat = (cible.genre === Genre.f ? "e" : "");
                        break;

                    // pronom
                    case 'pronom':
                    case 'il':
                        if (ClasseUtils.heriteDe(cible.classe, EClasseRacine.element)) {
                            resultat = (cible.genre === Genre.f ? "elle" : "il") + (cible.nombre === Nombre.p ? "s" : "");
                        } else {
                            console.error("interpreterContenuDire: pronom ceci: ceci n'est pas un élément.");
                        }
                        break;

                    // pronom (majuscule)
                    case 'Pronom':
                    case 'Il':
                        resultat = (cible.genre === Genre.f ? "Elle" : "Il") + (cible.nombre === Nombre.p ? "s" : "");
                        break;

                    // cod: l’ ou les
                    case 'l’':
                    case 'l\'':
                        resultat = (cible.nombre === Nombre.p ? "les " : "l’");
                        break;

                    // cod: le, la ou les
                    case 'le':
                        // singulier
                        if ((ceci as ElementJeu).nombre !== Nombre.p) {
                            // masculin
                            if ((ceci as ElementJeu).genre !== Genre.f) {
                                resultat = "le";
                                // féminin
                            } else {
                                resultat = "la";
                            }
                            // pluriel
                        } else {
                            resultat = "les";
                        }
                        break;

                    // lui, elle, eux, elles
                    case 'lui':
                        // singulier
                        if ((ceci as ElementJeu).nombre !== Nombre.p) {
                            // masculin
                            if ((ceci as ElementJeu).genre !== Genre.f) {
                                resultat = "lui";
                                // féminin
                            } else {
                                resultat = "elle";
                            }
                            // pluriel
                        } else {
                            // masculin
                            if ((ceci as ElementJeu).genre !== Genre.f) {
                                resultat = "eux";
                                // féminin
                            } else {
                                resultat = "elles";
                            }
                        }
                        break;

                    // inconnu
                    default:
                        console.error("interpreterContenuDire: propriete pas prise en charge:", proprieteString);
                        break;
                }

                // remplacer la balise par le résultat
                const xCurBalise = new RegExp("\\[" + proprieteString + " " + cibleString + "\\]", "g");
                contenu = contenu.replace(xCurBalise, resultat);

            });

        }

        // Aperçu (d’un objet)
        if (contenu.includes("[aperçu") || contenu.includes("[apercu")) {
            if (contenu.includes("[aperçu ceci]") || contenu.includes("[apercu ceci]")) {
                let apercuCeci = "???";
                if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.element)) {
                    const eleCeci = ceci as ElementJeu;
                    apercuCeci = this.calculerDescription(eleCeci.apercu, ++eleCeci.nbAffichageApercu, this.jeu.etats.possedeEtatIdElement(eleCeci, this.jeu.etats.intactID), ceci, cela);
                    contenu = contenu.replace(/\[(aperçu|apercu) ceci\]/g, apercuCeci);
                } else if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.direction)) {
                    const dirCeci = ceci as Localisation;
                    let voisinID = this.eju.getVoisinDirectionID(dirCeci, EClasseRacine.lieu);
                    if (voisinID !== -1) {
                        let voisin = this.eju.getLieu(voisinID);
                        apercuCeci = this.calculerDescription(voisin.apercu, ++voisin.nbAffichageApercu, this.jeu.etats.possedeEtatIdElement(voisin, this.jeu.etats.intactID), ceci, cela);
                    } else {
                        console.error("interpreterContenuDire: aperçu de ceci: voisin pas trouvé dans cette direction.");
                    }
                } else {
                    console.error("interpreterContenuDire: aperçu de ceci: ceci n'est pas un élément jeu");
                }
                contenu = contenu.replace(/\[(aperçu|apercu) ceci\]/g, apercuCeci);
            }
            if (contenu.includes("[aperçu cela]") || contenu.includes("[apercu cela]")) {
                let apercuCela = "???";
                if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.element)) {
                    const eleCela = cela as ElementJeu;
                    apercuCela = this.calculerDescription(eleCela.apercu, ++eleCela.nbAffichageApercu, this.jeu.etats.possedeEtatIdElement(eleCela, this.jeu.etats.intactID), ceci, cela);
                    contenu = contenu.replace(/\[(aperçu|apercu) cela\]/g, apercuCela);
                } else if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.direction)) {
                    const dirCela = cela as Localisation;
                    let voisinID = this.eju.getVoisinDirectionID(dirCela, EClasseRacine.lieu);
                    if (voisinID !== -1) {
                        let voisin = this.eju.getLieu(voisinID);
                        apercuCela = this.calculerDescription(voisin.apercu, ++voisin.nbAffichageApercu, this.jeu.etats.possedeEtatIdElement(voisin, this.jeu.etats.intactID), ceci, cela);
                    } else {
                        console.error("interpreterContenuDire: aperçu de cela: voisin pas trouvé dans cette direction.");
                    }
                } else {
                    console.error("interpreterContenuDire: aperçu de cela: cela n'est pas un élément jeu");
                }
            }
        }

        // Texte (d’un objet)
        if (contenu.includes("[texte")) {
            if (contenu.includes("[texte ceci]")) {
                if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.objet)) {
                    const objCeci = ceci as Objet;
                    const texteCeci = this.calculerDescription(objCeci.texte, ++objCeci.nbAffichageTexte, this.jeu.etats.possedeEtatIdElement(objCeci, this.jeu.etats.intactID), ceci, cela);
                    contenu = contenu.replace(/\[texte ceci\]/g, texteCeci);
                } else {
                    console.error("interpreterContenuDire: texte de ceci: ceci n'est pas un objet");
                }
            }
            if (contenu.includes("[texte cela]")) {
                if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.objet)) {
                    const objCela = cela as Objet;
                    const texteCela = this.calculerDescription(objCela.texte, ++objCela.nbAffichageTexte, this.jeu.etats.possedeEtatIdElement(objCela, this.jeu.etats.intactID), ceci, cela);
                    contenu = contenu.replace(/\[texte cela\]/g, texteCela);
                } else {
                    console.error("interpreterContenuDire: texte de cela: cela n'est pas un objet");
                }
            }
        }

        // ================================================================================
        // STATUT
        // ================================================================================

        // statut (porte, contenant)
        if (contenu.includes("[statut")) {
            if (contenu.includes("[statut ceci]")) {
                if (ceci && ClasseUtils.heriteDe(ceci.classe, EClasseRacine.objet)) {
                    const statutCeci = this.afficherStatut(ceci as Objet);
                    contenu = contenu.replace(/\[statut ceci\]/g, statutCeci);
                } else {
                    console.error("interpreterContenuDire: statut de ceci: ceci n'est pas un objet");
                }
            }
            if (contenu.includes("[statut cela]")) {
                if (cela && ClasseUtils.heriteDe(cela.classe, EClasseRacine.objet)) {
                    const statutCela = this.afficherStatut(cela as Objet);
                    contenu = contenu.replace(/\[statut cela\]/g, statutCela);
                } else {
                    console.error("interpreterContenuDire: statut de cela: cela n'est pas un objet");
                }
            }
        }

        // ================================================================================
        // OBJETS (CONTENU) [liste|décrire objets sur|sous|dans ici|ceci|cela|inventaire]
        // ================================================================================
        if (contenu.includes("[lister objets ") || contenu.includes("[décrire objets ")) {

            // retrouver toutes les balises de contenu [objets {sur|dans|sous} ceci|cela|ici|inventaire]
            const xBaliseContenu = /\[(décrire|lister) objets (?:(sur|sous|dans|) )?(ici|ceci|cela|inventaire)\]/gi;
            const allBalises = contenu.match(xBaliseContenu);
            // ne garder qu’une seule occurence de chaque afin de ne pas calculer plusieurs fois la même balise.
            const balisesUniques = allBalises.filter((valeur, index, tableau) => tableau.indexOf(valeur) === index)

            // parcourir chaque balise trouvée
            balisesUniques.forEach(curBalise => {
                // retrouver la préposition et la cible
                const decoupe = /\[(décrire|lister) objets (?:(sur|sous|dans|) )?(ici|ceci|cela|inventaire)\]/i.exec(curBalise);

                const ListerDecrireString = decoupe[1];
                let isLister = ListerDecrireString.toLowerCase() == 'lister';
                const prepositionString = decoupe[2]; // dans par défaut
                const cibleString = decoupe[3];

                let phraseSiVide = "";
                let phraseSiQuelqueChose = "{n}Vous voyez ";
                let afficherObjetsCaches = true;

                const cible: ElementJeu = this.getCible(cibleString, ceci, cela);

                // cas particuliers
                // > inventaire / joueur
                if (cible == this.jeu.joueur) {
                    phraseSiQuelqueChose = "";
                    // > ici
                } else if (cible == this.eju.curLieu) {
                    afficherObjetsCaches = false;
                }

                // retrouver la préposition (dans par défaut)
                let preposition = PrepositionSpatiale.dans;
                if (prepositionString) {
                    preposition = PositionObjet.getPrepositionSpatiale(prepositionString);
                }
                if (cible != this.eju.curLieu) {
                    switch (preposition) {
                        case PrepositionSpatiale.sur:
                            phraseSiVide = "{n}Il n’y a rien dessus.";
                            break;

                        case PrepositionSpatiale.sous:
                            phraseSiVide = "{n}Il n’y a rien dessous.";

                        case PrepositionSpatiale.dans:
                        default:
                            phraseSiVide = "{n}[Pronom " + cibleString + "] [v être ipr " + cibleString + "] vide[s " + cibleString + "].";
                    }
                }

                let resultatCurBalise: string;

                if (isLister) {
                    resultatCurBalise = this.executerListerContenu(cible, afficherObjetsCaches, false, preposition).sortie;
                } else {
                    resultatCurBalise = this.executerDecrireContenu(cible, phraseSiQuelqueChose, phraseSiVide, afficherObjetsCaches, false, preposition).sortie;
                }

                // remplacer la balise par le résultat
                const xCurBalise = new RegExp("\\[" + ListerDecrireString + " objets " + (prepositionString ? (prepositionString + " ") : "") + cibleString + "\\]", "g");
                contenu = contenu.replace(xCurBalise, resultatCurBalise);

            });

        }

        // ================================================================================
        // OSTACLE
        // ================================================================================

        if (contenu.includes("[obstacle ")) {
            if (contenu.includes("[obstacle vers ceci]")) {
                if (ceci) {
                    let obstacleVersCeci: string = null;
                    if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.direction)) {
                        obstacleVersCeci = this.afficherObstacle((ceci as Localisation).id);
                        contenu = contenu.replace(/\[obstacle vers ceci\]/g, obstacleVersCeci);
                    } else if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.lieu)) {
                        obstacleVersCeci = this.afficherObstacle(ceci as Lieu);
                        contenu = contenu.replace(/\[obstacle vers ceci\]/g, obstacleVersCeci);
                    } else {
                        console.error("interpreterContenuDire: statut sortie vers ceci: ceci n’est ni une direction ni un lieu.");
                    }
                } else {
                    console.error("interpreterContenuDire: statut sortie vers ceci: ceci est null.");
                }
            }
            if (contenu.includes("[obstacle vers cela]")) {
                if (cela) {
                    let obstacleVersCela: string = null;
                    if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.direction)) {
                        obstacleVersCela = this.afficherObstacle((cela as Localisation).id);
                        contenu = contenu.replace(/\[obstacle vers cela\]/g, obstacleVersCela);
                    } else if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.lieu)) {
                        obstacleVersCela = this.afficherObstacle(cela as Lieu);
                        contenu = contenu.replace(/\[obstacle vers cela\]/g, obstacleVersCela);
                    } else {
                        console.error("interpreterContenuDire: statut sortie vers cela: cela n’est ni une direction ni un lieu.");
                    }
                } else {
                    console.error("interpreterContenuDire: statut sortie vers cela: cela est null.");
                }
            }
        }

        // sorties
        if (contenu.includes("[sorties ici]")) {
            const sortiesIci = this.afficherSorties(this.eju.curLieu);
            contenu = contenu.replace(/\[sorties ici\]/g, sortiesIci);
        }

        // titre
        if (contenu.includes("[titre ici]")) {
            const titreIci = this.eju.curLieu.titre;
            contenu = contenu.replace(/\[titre ici\]/g, titreIci);
        }

        // aide
        if (contenu.includes("[aide")) {
            if (contenu.includes("[aide ceci]")) {
                const aideCeci = this.recupererFicheAide(ceci);
                contenu = contenu.replace(/\[aide ceci\]/g, aideCeci);
            }
            if (contenu.includes("[aide cela]")) {
                const aideCela = this.recupererFicheAide(cela);
                contenu = contenu.replace(/\[aide cela\]/g, aideCela);
            }
        }


        // ===================================================
        // PROPRIÉTÉS [p nomPropriété ici|ceci|cela]
        // ===================================================
        if (contenu.includes("[p ")) {
            // retrouver toutes les balises de propriété [p xxx ceci]
            const xBaliseGenerique = /\[p (\S+) (ici|ceci|cela)\]/gi;
            const allBalises = contenu.match(xBaliseGenerique);
            // ne garder qu’une seule occurence de chaque afin de ne pas calculer plusieurs fois la même balise.
            const balisesUniques = allBalises.filter((valeur, index, tableau) => tableau.indexOf(valeur) === index)
            // parcourir chaque balise trouvée
            balisesUniques.forEach(curBalise => {
                // retrouver la proppriété et la cible
                const decoupe = /\[p (\S+) (ici|ceci|cela)\]/i.exec(curBalise);
                const proprieteString = decoupe[1];
                const cibleString = decoupe[2];
                let cible: ElementJeu = this.getCible(cibleString, ceci, cela);
                let resultatCurBalise: string = null;
                if (cible) {
                    switch (proprieteString) {
                        case 'nom':
                            resultatCurBalise = cible.nom;
                            break;
                        case 'titre':
                            resultatCurBalise = cible.titre;
                            break;
                        case 'description':
                            resultatCurBalise = this.calculerDescription(cible.description, ++cible.nbAffichageDescription, this.jeu.etats.possedeEtatIdElement(cible, this.jeu.etats.intactID), ceci, cela);
                            break;
                        case 'intitulé':
                        case 'intitule':
                            resultatCurBalise = this.eju.calculerIntituleElement(cible, false, true);
                            break;
                        case 'Intitulé':
                        case 'Intitule':
                            resultatCurBalise = this.eju.calculerIntituleElement(cible, true, true);
                            break;
                        case 'texte':
                            resultatCurBalise = this.calculerDescription(cible.texte, ++cible.nbAffichageTexte, this.jeu.etats.possedeEtatIdElement(cible, this.jeu.etats.intactID), ceci, cela);
                            break;
                        default:
                            const propriete = cible.proprietes.find(x => x.nom == proprieteString);
                            if (propriete) {
                                resultatCurBalise = propriete.valeur;
                            } else {
                                resultatCurBalise = "(propriété « " + proprieteString + " » pas trouvée)";
                            }
                            break;
                    }

                } else {
                    resultatCurBalise = "(" + cibleString + " est null)";
                }
                // remplacer la balise par le résultat
                const xCurBalise = new RegExp("\\[p " + proprieteString + " " + cibleString + "\\]", "g");
                contenu = contenu.replace(xCurBalise, resultatCurBalise);
            });
        }

        // ===================================================
        // PROPRIÉTÉS [c nomCompteur]
        // ===================================================
        if (contenu.includes("[c ")) {
            // retrouver toutes les balises de propriété [p xxx ceci]
            const xBaliseGenerique = /\[c (\S+)\]/gi;
            const allBalises = contenu.match(xBaliseGenerique);
            // ne garder qu’une seule occurence de chaque afin de ne pas calculer plusieurs fois la même balise.
            const balisesUniques = allBalises.filter((valeur, index, tableau) => tableau.indexOf(valeur) === index)
            // parcourir chaque balise trouvée
            balisesUniques.forEach(curBalise => {
                // retrouver la proppriété et la cible
                const decoupe = /\[c (\S+)\]/i.exec(curBalise);
                const compteurString = decoupe[1];
                let resultatCurBalise: string = null;
                const compteur = this.jeu.compteurs.find(x => x.nom == compteurString);
                if (compteur) {
                    resultatCurBalise = compteur.valeur.toString();
                } else {
                    resultatCurBalise = "(compteur « " + compteurString + " » pas trouvée)";
                }
                // remplacer la balise par le résultat
                const xCurBalise = new RegExp("\\[c " + compteurString + "\\]", "g");
                contenu = contenu.replace(xCurBalise, resultatCurBalise);
            });
        }

        // ===================================================
        // CONJUGAISON
        // ===================================================

        // verbe(1) modeTemps(2) [negation(3)] sujet(4)
        const baliseVerbe = "v ((?:s’|s')?être|avoir|vivre|(?:s’|s')?ouvrir|(?:se )?fermer) (ipr|ipac|iimp|ipqp|ipas|ipaa|ifus|ifua|cpr|cpa|spr|spa|simp|spqp) (?:(pas|plus|que|ni) )?(ceci|cela|ici)";
        const xBaliseVerbeMulti = new RegExp("\\[" + baliseVerbe + "\\]", "gi");
        const xBaliseVerbeSolo = new RegExp("\\[" + baliseVerbe + "\\]", "i");

        if (xBaliseVerbeMulti.test(contenu)) {

            // retrouver toutes les balises de contenu [objets {sur|dans|sous} ceci|cela|ici|inventaire]
            const allBalises = contenu.match(xBaliseVerbeMulti);
            // ne garder qu’une seule occurence de chaque afin de ne pas calculer plusieurs fois la même balise.
            const balisesUniques = allBalises.filter((valeur, index, tableau) => tableau.indexOf(valeur) === index)
            // parcourir chaque balise trouvée
            balisesUniques.forEach(curBalise => {
                // retrouver la préposition et la cible
                const decoupe = xBaliseVerbeSolo.exec(curBalise);

                const verbe = decoupe[1];
                const modeTemps = decoupe[2];
                const negation = decoupe[3];
                const sujet = decoupe[4];

                // retrouver le verbe conjugué
                const verbeConjugue: string = InstructionDire.calculerConjugaison(verbe, modeTemps, negation, sujet, this.eju.curLieu, ceci, cela);

                // remplacer la balise par le verbe conjugué
                const expression = `v ${verbe} ${modeTemps}${(negation ? (" " + negation) : "")} ${sujet}`;
                const regExp = new RegExp("\\[" + expression + "\\]", "g");
                contenu = contenu.replace(regExp, verbeConjugue);

            });
        }

        // ===================================================
        // CONDITIONS
        // ===================================================

        // interpréter les balises encore présentes
        if (contenu.includes("[")) {
            contenu = this.calculerDescription(contenu, nbExecutions, null, ceci, cela);
        }

        // ===================================================
        // RETOUR CONDITIONNEL
        // ===================================================

        if (contenu.includes("{N}")) {
            // retirer toutes les balises de style
            const testVide = contenu
                .replace(/\{\S\}/g, "") // {x}
                .replace(/\{\S/g, "")   // {x
                .replace(/\S\}/g, "")   // x}
                .trim();

            // contenu vide
            if (testVide == "") {
                // => pas de \n
                contenu = contenu.replace(/\{N\}/g, "");
                // contenu pas vide
            } else {
                // sera remplacé lors de la transformation en HTML si ne débute pas le bloc de texte.
                // contenu = contenu.replace(/\{N\}/g, "\n");
            }
        }

        return contenu;
    }

    /** Vérifier si une condition [] est remplie. */
    private estConditionDescriptionRemplie(condition: string, statut: StatutCondition, ceci: ElementJeu | Intitule, cela: ElementJeu | Intitule): boolean {

        let retVal = false;
        let conditionLC = condition.toLowerCase();
        const resultFois = conditionLC.match(xFois);

        // X-ÈME FOIS
        if (resultFois) {
            statut.conditionDebutee = ConditionDebutee.fois;
            const nbFois = Number.parseInt(resultFois[1], 10);
            statut.nbChoix = InstructionDire.calculerNbChoix(statut);
            retVal = (statut.nbAffichage === nbFois);
            // AU HASARD
        } else if (conditionLC === "au hasard") {
            statut.conditionDebutee = ConditionDebutee.hasard;
            statut.dernIndexChoix = 1;
            // compter le nombre de choix
            statut.nbChoix = InstructionDire.calculerNbChoix(statut);
            // choisir un choix au hasard
            const rand = Math.random();
            statut.choixAuHasard = Math.floor(rand * statut.nbChoix) + 1;
            retVal = (statut.choixAuHasard == 1);
            // EN BOUCLE
        } else if (conditionLC === "en boucle") {
            statut.conditionDebutee = ConditionDebutee.boucle;
            statut.dernIndexChoix = 1;
            // compter le nombre de choix
            statut.nbChoix = InstructionDire.calculerNbChoix(statut);
            retVal = (statut.nbAffichage % statut.nbChoix === 1);
            // INITIALEMENT
        } else if (conditionLC === "initialement") {
            statut.conditionDebutee = ConditionDebutee.initialement;
            retVal = statut.initial;
            // SI
        } else if (conditionLC.startsWith("si ")) {
            statut.conditionDebutee = ConditionDebutee.si;
            const condition = PhraseUtils.getCondition(conditionLC);
            statut.siVrai = this.cond.siEstVraiAvecLiens(null, condition, ceci, cela);
            retVal = statut.siVrai;
            // SUITES
        } else if (statut.conditionDebutee !== ConditionDebutee.aucune) {

            // SINONSI
            if (conditionLC.startsWith("sinonsi ") || conditionLC.startsWith("sinon si ")) {
                if (statut.conditionDebutee === ConditionDebutee.si) {
                    // le si précédent était vrai => la suite sera fausse
                    if (statut.siVrai) {
                        // (on laisse le statut siVrai à true pour les sinonsi/sinon suivants)
                        retVal = false;
                        // le si précédent était faux => tester le sinonsi
                    } else {
                        // (on retire le « sinon » qui précède le si)
                        conditionLC = conditionLC.substr('sinon'.length).trim()
                        // tester le si
                        const condition = PhraseUtils.getCondition(conditionLC);
                        statut.siVrai = this.cond.siEstVraiAvecLiens(null, condition, ceci, cela);
                        retVal = statut.siVrai;
                    }
                } else {
                    console.warn("[sinonsi …] sans 'si'.");
                    retVal = false;
                }
            } else {
                retVal = false;
                switch (conditionLC) {
                    // OU
                    case 'ou':
                        if (statut.conditionDebutee === ConditionDebutee.hasard) {
                            retVal = (statut.choixAuHasard === ++statut.dernIndexChoix);
                        } else {
                            console.warn("[ou] sans 'au hasard'.");
                        }
                        break;
                    // PUIS
                    case 'puis':
                        if (statut.conditionDebutee === ConditionDebutee.fois) {
                            // toutes les fois suivant le dernier Xe fois
                            retVal = (statut.nbAffichage > statut.plusGrandChoix);
                        } else if (statut.conditionDebutee === ConditionDebutee.boucle) {
                            // boucler
                            statut.dernIndexChoix += 1;
                            retVal = (statut.nbAffichage % statut.nbChoix === (statut.dernIndexChoix == statut.nbChoix ? 0 : statut.dernIndexChoix));
                        } else if (statut.conditionDebutee === ConditionDebutee.initialement) {
                            // quand on est plus dans initialement
                            retVal = !statut.initial;
                        } else {
                            console.warn("[puis] sans 'fois', 'boucle' ou 'initialement'.");
                        }
                        break;
                    // SINON
                    case 'sinon':
                        if (statut.conditionDebutee === ConditionDebutee.si) {
                            retVal = !statut.siVrai;
                        } else {
                            console.warn("[sinon] sans 'si'.");
                            retVal = false;
                        }
                        break;
                    // FIN CHOIX
                    case 'fin choix':
                    case 'finchoix':
                        if (statut.conditionDebutee === ConditionDebutee.boucle || statut.conditionDebutee === ConditionDebutee.fois || statut.conditionDebutee == ConditionDebutee.hasard || statut.conditionDebutee === ConditionDebutee.initialement) {
                            retVal = true;
                        } else {
                            console.warn("[fin choix] sans 'fois', 'boucle', 'hasard' ou 'initialement'.");
                        }
                        break;
                    // FIN SI
                    case 'fin si':
                    case 'finsi':
                        if (statut.conditionDebutee === ConditionDebutee.si) {
                            retVal = true;
                        } else {
                            console.warn("[fin si] sans 'si'.");
                        }
                        break;

                    default:
                        console.warn("estConditionDescriptionRemplie > je ne sais pas quoi faire pour cette balise :", conditionLC);
                        break;
                }
            }
        }

        if (this.verbeux) {
            console.log("estConditionDescriptionRemplie", condition, statut, retVal);
        }
        return retVal;
    }

    private static calculerNbChoix(statut: StatutCondition) {
        let nbChoix = 0;
        let index = statut.curMorceauIndex;
        do {
            index += 2;
            nbChoix += 1;
        } while (statut.morceaux[index] !== 'fin choix' && (index < (statut.morceaux.length - 3)));

        // si on est dans une balise fois et si il y a un "puis"
        // => récupérer le dernier élément fois pour avoir le plus élevé
        if (statut.conditionDebutee == ConditionDebutee.fois) {

            if (statut.morceaux[index - 2] === "puis") {
                const result = statut.morceaux[index - 4].match(xFois);
                if (result) {
                    statut.plusGrandChoix = Number.parseInt(result[1], 10);
                } else {
                    console.warn("'puis' ne suit pas un 'Xe fois'");
                }
            }
        }
        return nbChoix;
    }

    // ===================================================
    // CONJUGAISON
    // ===================================================

    private static calculerConjugaison(verbe: string, modeTemps: string, negation: string, sujetStr: string, ici: Lieu, ceci: ElementJeu | Intitule, cela: ElementJeu | Intitule): string {

        // retrouver et contrôler le sujet
        let sujet: ElementJeu | Intitule = null;
        switch (sujetStr) {
            case 'ceci':
                sujet = ceci;
                break;
            case 'cela':
                sujet = cela;
                break;
            case 'ici':
                sujet = ici;
                break;
            default:
                break;
        }
        if (!sujet || !ClasseUtils.heriteDe(sujet.classe, EClasseRacine.element)) {
            console.error("calculerConjugaison > «", sujetStr, "» n’est pas un élément du jeu");
        }

        // retrouver le verbe
        let conjugaison = Conjugaison.getVerbe(verbe);
        let verbeConjugue: string = null;
        // verbe trouvé
        if (conjugaison) {
            // retrouver la forme demandée
            const personne = ((sujet as ElementJeu).nombre == Nombre.p) ? "3pp" : "3ps";
            const cle = modeTemps + " " + personne;
            // forme trouvée
            if (conjugaison.has(cle)) {
                verbeConjugue = conjugaison.get(cle);
                // forme pas trouvée
            } else {
                verbeConjugue = "(forme pas prise en charge : " + verbe + ": " + cle + ")";
            }
            // verbe pas trouvé
        } else {
            console.error("calculerConjugaison > verbe pas pris en charge:", verbe);
            verbeConjugue = "(verbe pas pris en charge : " + verbe + ")";
        }

        let verbeDecoupe = verbeConjugue.split(" ", 2);

        // tenir compte du se/s’
        if (verbe.match(/(se |s’|s')(.+)/)) {
            let se: string = null;
            if (verbeConjugue.match(/^(a|e|é|è|ê|i|o|u|y)(.+)/)) {
                se = "s’";
            } else {
                se = "se ";
            }
            // se avec négation
            if (negation) {
                // temps simple
                if (verbeDecoupe.length == 1) {
                    verbeConjugue = "ne " + se + verbeConjugue + " " + negation;
                    // temps composé
                } else {
                    verbeConjugue = "ne " + se + verbeDecoupe[0] + " " + negation + " " + verbeDecoupe[1];
                }
                // se sans négation
            } else {
                verbeConjugue = se + verbeConjugue;
            }
            // pas de se/s’
        } else {
            // ajouter la négation (sans se)
            if (negation) {
                let ne: string = null;
                if (verbeConjugue.match(/^(a|e|é|è|ê|i|o|u|y)(.+)/)) {
                    ne = "n’";
                } else {
                    ne = "ne ";
                }
                // temps simple
                if (verbeDecoupe.length == 1) {
                    verbeConjugue = ne + verbeConjugue + " " + negation;
                    // temps composé
                } else {
                    verbeConjugue = ne + verbeDecoupe[0] + " " + negation + " " + verbeDecoupe[1];
                }
            }
        }

        return verbeConjugue;
    }

    /**
   * Calculer une description en tenant compte des balises conditionnelles et des états actuels.
   */
    private calculerDescription(description: string, nbAffichage: number, intact: boolean, ceci: ElementJeu | Intitule, cela: ElementJeu | Intitule) {
        let retVal = "";
        if (description) {
            const morceaux = description.split(/\[|\]/);
            let statut = new StatutCondition(nbAffichage, intact, morceaux, 0);
            // jamais une condition au début car dans ce cas ça donne une première chaine vide.
            let suivantEstCondition = false; // description.trim().startsWith("[");
            let afficherMorceauSuivant = true;
            // console.log("$$$$$$$$$$$ morceaux=", morceaux, "suivantEstCondition=", suivantEstCondition);
            for (let index = 0; index < morceaux.length; index++) {
                statut.curMorceauIndex = index;
                const curMorceau = morceaux[index];
                if (suivantEstCondition) {
                    afficherMorceauSuivant = this.estConditionDescriptionRemplie(curMorceau, statut, ceci, cela);
                    suivantEstCondition = false;
                } else {
                    if (afficherMorceauSuivant) {
                        retVal += curMorceau;
                    }
                    suivantEstCondition = true;
                }
            }
        } else {
            retVal = "";
        }
        return retVal;
    }

    /** Afficher la fiche d’aide. */
    private recupererFicheAide(intitule: Intitule) {
        const ficheAide = this.jeu.aides.find(x => x.infinitif === intitule.nom);
        if (ficheAide) {
            return ficheAide.informations;
        } else {
            return "Désolé, je n’ai pas de page d’aide concernant la commande « " + intitule.nom + " »";
        }
    }

    /** Afficher le statut d'une porte ou d'un contenant (verrouilé, ouvrable, ouvert, fermé) */
    private afficherStatut(obj: Objet) {
        let retVal = "";
        if (ClasseUtils.heriteDe(obj.classe, EClasseRacine.contenant) || ClasseUtils.heriteDe(obj.classe, EClasseRacine.porte)) {

            const ouvrable = this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.ouvrableID);
            const ouvert = this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.ouvertID);
            const verrouillable = this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.verrouillableID);;
            const verrou = this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.verrouilleID);;

            if (obj.genre == Genre.f) {
                if (ouvert) {
                    // pas besoin de préciser qu’on contenant est ouvert, sauf s’il est ouvrable.
                    if (!ClasseUtils.heriteDe(obj.classe, EClasseRacine.contenant) || ouvrable) {
                        retVal += "Elle est ouverte.";
                    }
                } else {
                    retVal += "Elle est fermée" + (verrouillable ? (verrou ? " et verrouillée." : " mais pas verrouillée.") : ".");
                }
                if (ouvrable && !verrou) {
                    retVal += " Vous pouvez " + (ouvert ? 'la fermer.' : 'l’ouvrir.');
                }
            } else {
                if (ouvert) {
                    // pas besoin de préciser qu’on contenant est ouvert, sauf s’il est ouvrable.
                    if (!ClasseUtils.heriteDe(obj.classe, EClasseRacine.contenant) || ouvrable) {
                        retVal += "Il est ouvert.";
                    }
                } else {
                    retVal += "Il est fermé" + (verrouillable ? (verrou ? " et verrouillé." : " mais pas verrouillé.") : ".");
                }
                if (ouvrable && !verrou) {
                    retVal += " Vous pouvez " + (ouvert ? 'le fermer.' : 'l’ouvrir.');
                }
            }
        }
        return retVal;
    }

    /**
 * Lister le contenu d'un objet ou d'un lieu.
 * Remarque: le contenu invisible n'est pas affiché.
 */
    public executerListerContenu(ceci: ElementJeu, afficherObjetsCachesDeCeci: boolean, afficherObjetsNonVisiblesDeCeci: boolean, prepositionSpatiale: PrepositionSpatiale, retrait: number = 1): Resultat {

        let resultat = new Resultat(false, '', 1);
        const objets = this.eju.trouverContenu(ceci, afficherObjetsCachesDeCeci, afficherObjetsNonVisiblesDeCeci, prepositionSpatiale);

        // si la recherche n’a pas retourné d’erreur
        if (objets !== null) {
            resultat.succes = true;

            // AFFICHER LES ÉLÉMENTS DIRECTS
            const nbObjets = objets.length;
            if (nbObjets > 0) {
                let curObjIndex = 0;
                objets.forEach(obj => {
                    ++curObjIndex;
                    resultat.sortie += "\n " + InstructionDire.getRetrait(retrait) + (retrait <= 1 ? "- " : "> ") + this.eju.calculerIntituleElement(obj, false, false);
                    // ajouter « (porté) » aux objets portés
                    if (this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.porteID)) {
                        resultat.sortie += " (" + this.jeu.etats.obtenirIntituleEtatPourElementJeu(obj, this.jeu.etats.porteID) + ")";
                    }
                    // ajouter « contenu » des contenants ouverts ou transparents
                    // S’IL S’AGIT D’UN CONTENANT
                    if (ClasseUtils.heriteDe(obj.classe, EClasseRacine.contenant)) {
                        // si le contenant est fermé => (fermé)
                        if (this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.fermeID)) {
                            resultat.sortie += " (fermé" + (obj.genre == Genre.f ? 'e' : '') + (obj.nombre == Nombre.p ? 's' : '') + ")";
                        }

                        // si on peut voir le contenu du contenant => contenu / (vide)
                        if (this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.ouvertID) ||
                            this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.transparentID)
                        ) {
                            let contenu = this.executerListerContenu(obj, false, false, prepositionSpatiale, retrait + 1).sortie;
                            if (contenu) {
                                resultat.sortie += contenu;
                            } else {
                                resultat.sortie += " (vide" + (obj.nombre == Nombre.p ? 's' : '') + ")";
                            }
                        }
                    }

                    // S’IL S’AGIT D’UN SUPPORT, AFFICHER LES ÉLÉMENTS POSITIONNÉS DESSUS
                    if (ClasseUtils.heriteDe(obj.classe, EClasseRacine.support)) {

                    }

                });

                // AFFICHER LES ÉLÉMENTS POSITIONNÉS SUR DES SUPPORTS
                let supportsSansApercu = objets.filter(x => ClasseUtils.heriteDe(x.classe, EClasseRacine.support));
                supportsSansApercu.forEach(support => {
                    // ne pas afficher les objets cachés du support (on ne l’examine pas directement)
                    const sousRes = this.executerListerContenu(support, false, false, PrepositionSpatiale.sur);
                    resultat.sortie += sousRes.sortie;
                });

            }

        }
        return resultat;
    }

    /**
     * Retourner un retrait de la taille spécifiée.
     */
    private static getRetrait(retrait: number): string {
        let retVal = "";
        for (let index = 0; index < retrait; index++) {
            retVal += "{r}";
        }
        return retVal;
    }

    /**
     * Décrire le contenu d'un objet ou d'un lieu.
     * Remarque: le contenu invisible n'est pas affiché.
     */
    public executerDecrireContenu(ceci: ElementJeu, texteSiQuelqueChose: string, texteSiRien: string, afficherObjetsCachesDeCeci: boolean, afficherObjetsNonVisiblesDeCeci: boolean, prepositionSpatiale: PrepositionSpatiale): Resultat {

        let resultat = new Resultat(false, '', 1);
        const objets = this.eju.trouverContenu(ceci, afficherObjetsCachesDeCeci, afficherObjetsNonVisiblesDeCeci, prepositionSpatiale);

        console.log("@@@ executerDecrireContenu > \nceci:", ceci, "\nprepositionSpatiale:", prepositionSpatiale, "\nobjets:", objets);
        


        // si la recherche n’a pas retourné d’erreur
        if (objets !== null) {
            resultat.succes = true;

            // - objets avec aperçu (ne pas lister les objets décoratifs):
            let objetsAvecApercu = objets.filter(x => x.apercu !== null && !this.jeu.etats.possedeEtatIdElement(x, this.jeu.etats.decoratifID));
            // const nbObjetsAvecApercus = objetsAvecApercu.length;
            // - objets sans apercu (ne pas lister les éléments décoratifs)
            let objetsSansApercu = objets.filter(x => x.apercu === null && !this.jeu.etats.possedeEtatIdElement(x, this.jeu.etats.decoratifID));
            let nbObjetsSansApercus = objetsSansApercu.length;

            // - supports décoratifs (eux ne sont pas affichés, mais leur contenu bien !)
            let supportsDecoratifs = objets.filter(x => this.jeu.etats.possedeEtatIdElement(x, this.jeu.etats.decoratifID) && ClasseUtils.heriteDe(x.classe, EClasseRacine.support));

            // A.1 AFFICHER ÉLÉMENTS AVEC UN APERÇU
            objetsAvecApercu.forEach(obj => {
                const apercuCalcule = this.calculerDescription(obj.apercu, obj.nbAffichageApercu, this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.intactID), null, null);
                // si l'aperçu n'est pas vide, l'ajouter.
                if (apercuCalcule) {
                    // (ignorer les objets dont l'aperçu vaut "-")
                    if (apercuCalcule !== '-') {
                        resultat.sortie += "{n}" + apercuCalcule;
                        // B.2 SI C’EST UN SUPPPORT, AFFICHER SON CONTENU (VISIBLE et NON Caché)
                        if (ClasseUtils.heriteDe(obj.classe, EClasseRacine.support)) {
                            // ne pas afficher objets cachés du support, on ne l’examine pas directement
                            const sousRes = this.executerDecrireContenu(obj, ("{n}Sur " + this.eju.calculerIntituleElement(obj, false, true) + " il y a "), "", false, false, PrepositionSpatiale.sur);
                            resultat.sortie += sousRes.sortie;
                        }
                    }
                    // si l'aperçu est vide, ajouter l'objets à la liste des objets sans aperçu.
                } else {
                    objetsSansApercu.push(obj);
                    nbObjetsSansApercus += 1;
                }
            });

            // B. AFFICHER LES ÉLÉMENTS POSITIONNÉS SUR DES SUPPORTS DÉCORATIFS
            supportsDecoratifs.forEach(support => {
                // ne pas afficher les objets cachés du support (on ne l’examine pas directement)
                const sousRes = this.executerDecrireContenu(support, ("{n}Sur " + this.eju.calculerIntituleElement(support, false, true) + " il y a "), "", false, false, PrepositionSpatiale.sur);
                resultat.sortie += sousRes.sortie;
            });

            // C.1 AFFICHER ÉLÉMENTS SANS APERÇU
            if (nbObjetsSansApercus > 0) {
                resultat.sortie += texteSiQuelqueChose;
                let curObjIndex = 0;
                objetsSansApercu.forEach(obj => {
                    ++curObjIndex;
                    resultat.sortie += this.eju.calculerIntituleElement(obj, false, false);
                    if (curObjIndex < (nbObjetsSansApercus - 1)) {
                        resultat.sortie += ", ";
                    } else if (curObjIndex == (nbObjetsSansApercus - 1)) {
                        resultat.sortie += " et ";
                    } else {
                        resultat.sortie += ".";
                    }
                });

                // C.2 AFFICHER LES ÉLÉMENTS POSITIONNÉS SUR DES SUPPORTS
                let supportsSansApercu = objetsSansApercu.filter(x => ClasseUtils.heriteDe(x.classe, EClasseRacine.support));
                supportsSansApercu.forEach(support => {
                    // ne pas afficher les objets cachés du support (on ne l’examine pas directement)
                    const sousRes = this.executerDecrireContenu(support, ("{n}Sur " + this.eju.calculerIntituleElement(support, false, true) + " il y a "), ("{n}Il n’y a rien sur " + this.eju.calculerIntituleElement(support, false, true) + "."), false, false, PrepositionSpatiale.sur);
                    resultat.sortie += sousRes.sortie;
                });

            }

            // D. AFFICHER LES PORTES SI C'EST UN LIEU
            if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.lieu)) {

                const curLieu: Lieu = ceci as Lieu;
                curLieu.voisins.forEach(voisin => {
                    if (voisin.type == EClasseRacine.porte) {
                        // vérifier si la porte est visible
                        const curPorte = this.eju.getObjet(voisin.id);
                        if (this.jeu.etats.estVisible(curPorte, this.eju)) {
                            // if (this.jeu.etats.possedeEtatIdElement(curPorte, this.jeu.etats.visibleID)) {
                            // décrire la porte
                            if (curPorte.apercu) {
                                if (curPorte.apercu != '-')
                                    // si aperçu, afficher l'aperçu.
                                    resultat.sortie += "{n}" + this.calculerDescription(curPorte.apercu, curPorte.nbAffichageApercu, this.jeu.etats.possedeEtatIdElement(curPorte, this.jeu.etats.intactID), null, null);
                            } else {
                                // par défaut, afficher le nom de la porte et ouvert/fermé.
                                resultat.sortie += "{n}" + ElementsJeuUtils.calculerIntituleGenerique(curPorte, true) + " est ";
                                if (this.jeu.etats.possedeEtatIdElement(curPorte, this.jeu.etats.ouvertID)) {
                                    resultat.sortie += this.jeu.etats.obtenirIntituleEtatPourElementJeu(curPorte, this.jeu.etats.ouvertID)
                                } else {
                                    resultat.sortie += this.jeu.etats.obtenirIntituleEtatPourElementJeu(curPorte, this.jeu.etats.fermeID)
                                }
                                resultat.sortie += ".";
                            }
                            //resultat.sortie += this.afficherStatut(curPorte);
                        }
                    }
                });
            }

            // si on n’a encore rien affiché, afficher le texte spécifique
            if (!resultat.sortie) {
                resultat.sortie = texteSiRien;
            }
        }
        return resultat;
    }

    /** Afficher le statut d'une porte ou d'un contenant (verrouilé, ouvrable, ouvert, fermé) */
    afficherObstacle(direction: Lieu | ELocalisation, texteSiAucunObstacle = "(aucun obstacle)") {
        let retVal: string = texteSiAucunObstacle;

        let loc: Localisation | ELocalisation = null;

        // si la direction est un lieu
        if (direction instanceof Lieu) {
            // chercher la direction vers ce lieu
            let voisin = this.eju.curLieu.voisins.find(x => x.type == EClasseRacine.lieu && x.id == (direction as Lieu).id);
            loc = voisin.localisation;
            // sinon c’est directement une direction
        } else {
            loc = direction;
            // cas particulier : si le joueur utilise entrer/sortir quand une seule sortie visible, aller dans la direction de cette sortie
            if (direction == ELocalisation.exterieur /*|| direction == ELocalisation.interieur*/) {
                const lieuxVoisinsVisibles = this.eju.getLieuxVoisinsVisibles(this.eju.curLieu);
                if (lieuxVoisinsVisibles.length == 1) {
                    loc = lieuxVoisinsVisibles[0].localisation;
                }
                // cas normal
            }
        }

        // trouver la porte qui est dans le chemin
        const porteID = this.eju.getVoisinDirectionID(loc, EClasseRacine.porte);
        if (porteID !== -1) {
            const porte = this.eju.getObjet(porteID);
            const ouvert = this.jeu.etats.possedeEtatIdElement(porte, this.jeu.etats.ouvertID);
            // const verrouillable = this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.verrouillableID);;
            // const verrou = this.jeu.etats.possedeEtatIdElement(obj, this.jeu.etats.verrouilleID);;
            if (porte.genre == Genre.f) {
                if (ouvert) {
                    // retVal = ElementsJeuUtils.calculerIntitule(porte, true) + " est ouverte.";
                    retVal = texteSiAucunObstacle;
                } else {
                    retVal = ElementsJeuUtils.calculerIntituleGenerique(porte, true) + " est fermée.";
                }
            } else {
                if (ouvert) {
                    // retVal = ElementsJeuUtils.calculerIntitule(porte, true) + " est ouvert.";
                    retVal = texteSiAucunObstacle;
                } else {
                    retVal = ElementsJeuUtils.calculerIntituleGenerique(porte, true) + " est fermé.";
                }
            }
        }
        return retVal;
    }

    /**
     * Afficher les sorties du lieu spécifié.
     */
    afficherSorties(lieu: Lieu): string {
        let retVal: string;

        if (this.jeu.parametres.activerAffichageSorties) {
            // retrouver les voisins visibles (càd PAS séparés par une porte à la fois invisible et fermée)
            const lieuxVoisinsVisibles = this.eju.getLieuxVoisinsVisibles(lieu);

            if (lieuxVoisinsVisibles.length > 0) {
                retVal = "Sorties :";
                // afficher les voisins : directions + lieux
                if (this.jeu.parametres.activerAffichageDirectionSorties) {
                    lieuxVoisinsVisibles.forEach(voisin => {
                        retVal += ("{n}{i}- " + this.afficherLieuVoisinEtLocalisation(voisin.localisation, lieu.id, voisin.id));
                    });
                    // afficher les voisins: lieux
                } else {
                    lieuxVoisinsVisibles.forEach(voisin => {
                        retVal += ("{n}{i}- " + this.afficherLieuVoisin(voisin.localisation, lieu.id, voisin.id));
                    });
                }

            } else {
                retVal = "Il n’y a pas de sortie.";
            }
        } else {
            retVal = "";
        }

        return retVal;
    }

    private afficherLieuVoisin(localisation: ELocalisation, curLieuIndex: number, voisinIndex: number) {
        let retVal: string = null;
        let lieu = this.eju.getLieu(voisinIndex);
        let titreLieu = lieu.titre;
        let obstacle = this.afficherObstacle(localisation, "");
        if (obstacle) {
            obstacle = " ({/obstrué/})";
        }
        retVal = titreLieu + obstacle;
        return retVal;
    }

    private afficherLieuVoisinEtLocalisation(localisation: ELocalisation, curLieuIndex: number, voisinIndex: number) {
        let retVal: string = null;
        let lieu = this.eju.getLieu(voisinIndex);
        let titreLieu = lieu.titre;
        let obstacle = this.afficherObstacle(localisation, "");

        if (obstacle) {
            obstacle = " ({/obstrué/})";
        }

        let lieuDejaVisite = this.jeu.etats.possedeEtatIdElement(lieu, this.jeu.etats.visiteID);

        switch (localisation) {
            case ELocalisation.nord:
                retVal = "nord" + obstacle + (lieuDejaVisite ? (" − " + titreLieu) : ' − ?');
                break;
            case ELocalisation.sud:
                retVal = "sud" + obstacle + (lieuDejaVisite ? (" − " + titreLieu) : ' − ?');
                break;
            case ELocalisation.est:
                retVal = "est" + obstacle + (lieuDejaVisite ? (" − " + titreLieu) : ' − ?');
                break;
            case ELocalisation.ouest:
                retVal = "ouest" + obstacle + (lieuDejaVisite ? (" − " + titreLieu) : ' − ?');
                break;
            case ELocalisation.bas:
                retVal = "descendre" + obstacle + " − " + titreLieu;
                break;
            case ELocalisation.haut:
                retVal = "monter" + obstacle + " − " + titreLieu;
                break;
            case ELocalisation.exterieur:
                retVal = "sortir" + obstacle + (lieuDejaVisite ? (" − " + titreLieu) : ' − ?');
                break;
            case ELocalisation.interieur:
                retVal = "entrer" + obstacle + " − " + titreLieu;
                break;

            default:
                retVal = localisation.toString();
        }

        return retVal;
    }

    /** Retrouver la cible sur base de son texte (ici, ceci, cela, inventaire, joueur) */
    private getCible(cibleString: string, ceci: ElementJeu | Intitule, cela: ElementJeu | Intitule): ElementJeu {
        let cible: ElementJeu = null;
        // retrouver la cible
        switch (cibleString) {
            case 'ici':
                cible = this.eju.curLieu;
                // afficherObjetsCaches = false;
                break;
            case 'ceci':
                cible = ceci as ElementJeu;
                break;
            case 'cela':
                cible = cela as ElementJeu;
                break;
            case 'inventaire':
            case 'joueur':
                cible = this.jeu.joueur;
                // phraseSiVide = "";
                // phraseSiQuelqueChose = "";
                break;
        }
        return cible;
    }

}