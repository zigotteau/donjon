import { EClasseRacine, EEtatsBase } from "../../models/commun/constantes";

import { ClasseUtils } from "../commun/classe-utils";
import { Compteur } from "../../models/compilateur/compteur";
import { CompteursUtils } from "./compteurs-utils";
import { ElementJeu } from "../../models/jeu/element-jeu";
import { ElementsJeuUtils } from "../commun/elements-jeu-utils";
import { ElementsPhrase } from "../../models/commun/elements-phrase";
import { Evenement } from "../../models/jouer/evenement";
import { InstructionDeplacerCopier } from "./instruction-deplacer-copier";
import { InstructionsUtils } from "./instructions-utils";
import { Intitule } from "../../models/jeu/intitule";
import { Jeu } from "../../models/jeu/jeu";
import { Objet } from "../../models/jeu/objet";
import { PhraseUtils } from "../commun/phrase-utils";
import { PrepositionSpatiale } from "../../models/jeu/position-objet";
import { ProprieteElement } from "../../models/commun/propriete-element";
import { Resultat } from "../../models/jouer/resultat";
import { TypeProprieteJeu } from "../../models/jeu/propriete-jeu";
import { TypeValeur } from "../../models/compilateur/type-valeur";

export class InstructionChanger {

  private insDeplacerCopier: InstructionDeplacerCopier;

  constructor(
    private jeu: Jeu,
    private eju: ElementsJeuUtils,
    private verbeux: boolean,
  ) { }

  /** Instructions */
  set instructionDeplacerCopier(instructionDeplacerCopier: InstructionDeplacerCopier) {
    this.insDeplacerCopier = instructionDeplacerCopier;
  }

  /** Changer quelque chose dans le jeu */
  public executerChanger(instruction: ElementsPhrase, ceci: ElementJeu | Compteur | Intitule = null, cela: ElementJeu | Compteur | Intitule = null, evenement: Evenement = null, declenchements: number): Resultat {

    let resultat = new Resultat(false, '', 1);

    // on veut changer un élément
    if (instruction.sujet) {
      switch (instruction.sujet.nom.toLowerCase()) {
        // joueur
        case 'joueur':
          resultat = this.changerJoueur(instruction, ceci, cela);
          break;
        // historique
        case 'historique':
          resultat = this.changerHistorique(instruction);
          break;

        // élément du jeu ou compteur (ceci)
        case 'ceci':
          if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.element)) {
            resultat = this.changerElementJeu(ceci as ElementJeu, instruction);
          } else if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.compteur)) {
            resultat = this.changerCompteur(ceci as Compteur, instruction, ceci, cela, evenement, declenchements);
          } else {
            console.error("executer changer ceci: ceci n'est pas un élément du jeu ou un compteur.");
          }
          break;

        // élément du jeu ou compteur (cela)
        case 'cela':
          if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.element)) {
            resultat = this.changerElementJeu(cela as ElementJeu, instruction);
          } else if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.compteur)) {
            resultat = this.changerCompteur(cela as Compteur, instruction, ceci, cela, evenement, declenchements);
          } else {
            console.error("executer changer cela: cela n'est pas un élément du jeu ou un compteur.");
          }
          break;

        default:
          let correspondance = this.eju.trouverCorrespondance(instruction.sujet, false, false);

          // PAS OBJET, PAS LIEU et PAS COMPTEUR
          if (correspondance.elements.length === 0 && correspondance.compteurs.length === 0) {
            console.error("executerChanger: pas trouvé l’élément " + instruction.sujet);
            resultat.sortie = "{+[Instruction « changer » : le sujet « " + instruction.sujet + " » n’a pas été trouvé.]+}";
            // OBJET(S) SEULEMENT
          } else if (correspondance.lieux.length === 0 && correspondance.compteurs.length === 0) {
            if (correspondance.objets.length === 1) {
              resultat = this.changerElementJeu(correspondance.objets[0], instruction);
            } else {
              console.error("executerChanger: plusieurs objets trouvés:", correspondance);
              resultat.sortie = "{n}{+[Instruction « changer » : plusieurs objets trouvés pour « " + instruction.sujet + " ».]+}";
            }
            // LIEU(X) SEULEMENT
          } else if (correspondance.objets.length === 0 && correspondance.compteurs.length === 0) {
            if (correspondance.lieux.length === 1) {
              resultat = this.changerElementJeu(correspondance.lieux[0], instruction);
            } else {
              console.error("executerChanger: plusieurs lieux trouvés:", correspondance);
              resultat.sortie = "{n}{+[Instruction « changer » : plusieurs lieux trouvés pour « " + instruction.sujet + " ».]+}";
            }
            // COMPTEUR(S) SEULEMENT
          } else if (correspondance.objets.length === 0 && correspondance.lieux.length === 0) {
            if (correspondance.compteurs.length === 1) {
              resultat = this.changerCompteur(correspondance.compteurs[0], instruction, ceci, cela, evenement, declenchements);
            } else {
              console.error("executerChanger: plusieurs compteurs trouvés:", correspondance);
              resultat.sortie = "{n}{+[Instruction « changer » : plusieurs compteurs trouvés pour « " + instruction.sujet + " ».]+}";
            }
          } else {
            console.error("executerChanger: trouvé lieu(x) ET objet(s):", correspondance);
            resultat.sortie = "{n}{+[Instruction « changer » : plusieurs éléments (lieux ET objets) trouvés pour « " + instruction.sujet + " ».]+}";
          }
          break;
      }
      // on veut changer une propriété
    } else if (instruction.proprieteSujet) {

      switch (instruction.proprieteSujet.type) {
        // on ne peut pas changer une propriété calculée
        case TypeProprieteJeu.nombreDeClasseAttributs:
        case TypeProprieteJeu.nombreDeClasseAttributsPosition:
          resultat.succes = false;
          resultat.sortie = "{+[Je ne peut pas changer directement une propriété calculée]+}";
          break;

        // propriété d’un élément
        case TypeProprieteJeu.nombreDeProprieteElement:
        case TypeProprieteJeu.proprieteElement:
          const propSujetTrouvee = InstructionsUtils.trouverProprieteCible(instruction.proprieteSujet, ceci, cela, this.eju, this.jeu) as ProprieteElement;
          if (propSujetTrouvee) {

            switch (instruction.verbe.toLowerCase()) {
              case 'augmente':
              case 'augmentent':
                CompteursUtils.changerValeurCompteurOuPropriete(propSujetTrouvee, 'augmente', instruction.complement1, this.eju, this.jeu, ceci, cela, evenement, declenchements)
                break;

              case 'diminue':
              case 'diminuent':
                CompteursUtils.changerValeurCompteurOuPropriete(propSujetTrouvee, 'diminue', instruction.complement1, this.eju, this.jeu, ceci, cela, evenement, declenchements)
                break;

              case 'vaut':
              case 'valent':
                CompteursUtils.changerValeurCompteurOuPropriete(propSujetTrouvee, 'vaut', instruction.complement1, this.eju, this.jeu, ceci, cela, evenement, declenchements)
                break;

              case 'est':
              case 'sont':
                CompteursUtils.changerValeurCompteurOuPropriete(propSujetTrouvee, 'est', instruction.complement1, this.eju, this.jeu, ceci, cela, evenement, declenchements)
                break;

              default:
                resultat.succes = false;
                console.error("changer propriété: pas compris le verbe:", instruction.verbe, instruction, this.eju, this.jeu);
                resultat.sortie = "{n}{+[Instruction « changer » : propriété « " + instruction.proprieteSujet + " » : verbe pas pris en charge: « " + instruction.verbe + " ».]+}";
                break;
            }

            // si suite à la modification de la quantité d’un objet, la quantité atteint 0, effacer l’objet.
            if (instruction.proprieteSujet.type === TypeProprieteJeu.proprieteElement && propSujetTrouvee.nom === 'quantité') {
              if (ClasseUtils.heriteDe(instruction.proprieteSujet.element.classe, EClasseRacine.objet) && instruction.proprieteSujet.element.quantite === 0) {
                const indexObjet = this.jeu.objets.indexOf((instruction.proprieteSujet.element as Objet));
                if (indexObjet !== -1) {
                  this.jeu.objets.splice(indexObjet, 1);
                } else {
                  console.error("executerChanger >> pas pu retrouver l’objet à supprimer (quantité à atteint 0).");
                }
              }
            }

            resultat.succes = true;
            console.log("propriété trouvée:", propSujetTrouvee);
          } else {
            console.error("executerChanger: propriété pas trouvée:", instruction.proprieteSujet);
            resultat.sortie = "{n}{+[Instruction « changer » : propriété pas trouvée : « " + instruction.proprieteSujet + " ».]+}";
          }
          break;

        default:
          console.error("executerChanger > Type de propriété non pris en charge:", instruction.proprieteSujet.type);
          break;
      }

      // ni élément ni propriété
    } else {
      console.error("executerChanger : pas de sujet ni de propriété, instruction:", instruction);
    }
    return resultat;
  }

  /** Exécuter une instruction qui cible l'historique. */
  private changerHistorique(instruction: ElementsPhrase) {
    let resultat = new Resultat(false, '', 1);
    if (instruction.verbe.toLocaleLowerCase() === 'contient') {
      let valeur = instruction.complement1.trim().toLocaleLowerCase();
      // trouver valeur dans l’historique
      let foundIndex = this.jeu.sauvegardes.indexOf(valeur);

      // SUPPRIMER la valeur de l’historique
      if (instruction.negation) {
        // supprimer seulement si présente
        if (foundIndex !== -1) {
          this.jeu.sauvegardes.splice(foundIndex, 1);
          resultat.succes = true;
        }
        // AJOUTER une valeur à l’historique
      } else {
        // ajouter seulement si pas encore présente
        if (foundIndex === -1) {
          this.jeu.sauvegardes.push(valeur);
          resultat.succes = true;
        }
      }
    } else {
      resultat.sortie = "{n}{+[Instruction « changer » : historique : verbe pas pris en charge: « " + instruction.verbe + " ».]+}";
    }
    return resultat;
  }

  /** Exécuter une instruction qui cible le joueur */
  private changerJoueur(instruction: ElementsPhrase, ceci: ElementJeu | Intitule, cela: ElementJeu | Intitule): Resultat {
    let resultat = new Resultat(false, '', 1);

    switch (instruction.verbe.toLowerCase()) {
      // DÉPLACER LE JOUEUR
      case 'se trouve':
        resultat = this.insDeplacerCopier.executerDeplacer(instruction.sujet, instruction.preposition1, instruction.sujetComplement1, ceci as Objet, cela);
        break;

      // AJOUTER UN OBJET A L'INVENTAIRE
      case 'possède':
        // Objet classique
        if (instruction.sujetComplement1) {
          resultat = this.insDeplacerCopier.executerDeplacer(instruction.sujetComplement1, "dans", instruction.sujet, ceci as Objet, cela);
          // Instruction spécifique
        } else if (instruction.complement1) {
          let objets: Objet[] = null;
          // - objets dans ceci
          if (instruction.complement1.endsWith('objets dans ceci')) {
            if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.objet)) {
              objets = this.eju.obtenirContenu(ceci as Objet, PrepositionSpatiale.dans);
            } else {
              console.error("Joueur possède objets dans ceci: ceci n'est as un objet.");
            }
            // - objets sur ceci
          } else if (instruction.complement1.endsWith('objets sur ceci')) {
            if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.objet)) {
              objets = this.eju.obtenirContenu(ceci as Objet, PrepositionSpatiale.sur);
            } else {
              console.error("Joueur possède objets sur ceci: ceci n'est as un objet.");
            }
            // - objets sous ceci
          } else if (instruction.complement1.endsWith('objets sous ceci')) {
            if (ClasseUtils.heriteDe(ceci.classe, EClasseRacine.objet)) {
              objets = this.eju.obtenirContenu(ceci as Objet, PrepositionSpatiale.sous);
            } else {
              console.error("Joueur possède objets sous ceci: ceci n'est as un objet.");
            }
            // - objets dans cela
          } else if (instruction.complement1.endsWith('objets dans cela')) {
            if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.objet)) {
              objets = this.eju.obtenirContenu(cela as Objet, PrepositionSpatiale.dans);
            } else {
              console.error("Joueur possède objets dans cela: cela n'est as un objet.");
            }
            // - objets sur cela
          } else if (instruction.complement1.endsWith('objets sur cela')) {
            if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.objet)) {
              objets = this.eju.obtenirContenu(cela as Objet, PrepositionSpatiale.sur);
            } else {
              console.error("Joueur possède objets sur cela: cela n'est as un objet.");
            }
            // - objets sous cela
          } else if (instruction.complement1.endsWith('objets sous cela')) {
            if (ClasseUtils.heriteDe(cela.classe, EClasseRacine.objet)) {
              objets = this.eju.obtenirContenu(cela as Objet, PrepositionSpatiale.sous);
            } else {
              console.error("Joueur possède objets sous cela: cela n'est as un objet.");
            }
            // - objets ici
          } else if (instruction.complement1.endsWith('objets ici')) {
            objets = this.eju.obtenirContenu(this.eju.curLieu, PrepositionSpatiale.dans);
          }

          // objets contenus trouvés
          if (objets) {
            resultat.succes = true;
            objets.forEach(el => {
              resultat = (resultat.succes && this.insDeplacerCopier.exectuterDeplacerObjetVersDestination(el, 'dans', this.jeu.joueur, el.quantite));
            });
          }
        }
        break;

      // PORTER UN OBJET (s'habiller avec)
      case 'porte':
        let objet: Objet = InstructionsUtils.trouverObjetCible(instruction.complement1, instruction.sujetComplement1, ceci, cela, this.eju, this.jeu);
        if (objet) {
          // NE porte PAS
          if (instruction.negation) {
            // l'objet n’est plus porté
            this.jeu.etats.retirerEtatElement(objet, EEtatsBase.porte, true);
            // PORTE
          } else {
            // déplacer l'objet vers l'inventaire
            resultat = this.insDeplacerCopier.exectuterDeplacerObjetVersDestination(objet, "dans", this.jeu.joueur, objet.quantite);
            // l'objet est porté
            this.jeu.etats.ajouterEtatElement(objet, EEtatsBase.porte, true);
          }
        }
        break;

      case 'est':
      case 'sont':
        const nEstPas = instruction.negation && (instruction.negation.trim() === 'pas' || instruction.negation.trim() === 'plus');
        // n'est pas => retirer un état
        if (nEstPas) {
          if (this.verbeux) {
            console.log("executerJoueur: retirer l’état '", instruction.complement1, "' ele=", this.jeu.joueur);
          }
          this.jeu.etats.retirerEtatElement(this.jeu.joueur, instruction.complement1);
          // est => ajouter un état
        } else {
          if (this.verbeux) {
            console.log("executerJoueur: ajouter l’état '", instruction.complement1, "'");
          }
          // séparer les attributs, les séparateurs possibles sont «, », « et » et « ou ».
          const attributsSepares = PhraseUtils.separerListeIntitules(instruction.complement1);
          attributsSepares.forEach(attribut => {
            this.jeu.etats.ajouterEtatElement(this.jeu.joueur, attribut);
          });
        }
        break;

      default:
        console.error("executerJoueur : pas compris verbe", instruction.verbe, instruction);
        resultat.sortie = "{n}{+[Instruction « changer » : joueur : verbe pas pris en charge: « " + instruction.verbe + " ».]+}";
        break;
    }
    return resultat;
  }

  private changerCompteur(compteur: Compteur, instruction: ElementsPhrase, ceci: ElementJeu | Compteur | Intitule = null, cela: ElementJeu | Compteur | Intitule = null, evenement: Evenement = null, declenchements: number): Resultat {
    let resultat = new Resultat(true, '', 1);

    switch (instruction.verbe.toLowerCase()) {
      case 'augmente':
      case 'augmentent':
        CompteursUtils.changerValeurCompteurOuPropriete(compteur, 'augmente', instruction.complement1, this.eju, this.jeu, ceci, cela, evenement, declenchements)
        break;

      case 'diminue':
      case 'diminuent':
        CompteursUtils.changerValeurCompteurOuPropriete(compteur, 'diminue', instruction.complement1, this.eju, this.jeu, ceci, cela, evenement, declenchements)
        break;

      case 'vaut':
      case 'valent':
        CompteursUtils.changerValeurCompteurOuPropriete(compteur, 'vaut', instruction.complement1, this.eju, this.jeu, ceci, cela, evenement, declenchements)
        break;

      default:
        resultat.succes = false;
        console.error("executerCompteur: pas compris le verbe:", instruction.verbe, instruction);
        resultat.sortie = "{n}{+[Instruction « changer » : compteur « " + instruction.sujet + " » : verbe pas pris en charge: « " + instruction.verbe + " ».]+}";
        break;
    }

    return resultat;

  }

  private changerElementJeu(element: ElementJeu, instruction: ElementsPhrase): Resultat {

    let resultat = new Resultat(true, '', 1);

    switch (instruction.verbe.toLowerCase()) {
      case 'est':
      case 'sont':
        const nEstPas = instruction.negation && (instruction.negation.trim() === 'pas' || instruction.negation.trim() === 'plus');
        // n'est pas => retirer un état
        if (nEstPas) {
          if (this.verbeux) {
            console.log("executerElementJeu: retirer l’état '", instruction.complement1, "' ele=", element);
          }
          this.jeu.etats.retirerEtatElement(element, instruction.complement1);
          // est => ajouter un état
        } else {
          if (this.verbeux) {
            console.log("executerElementJeu: ajouter l’état '", instruction.complement1, "'");
          }
          // séparer les attributs, les séparateurs possibles sont «, », « et » et « ou ».
          const attributsSepares = PhraseUtils.separerListeIntitules(instruction.complement1);
          attributsSepares.forEach(attribut => {
            this.jeu.etats.ajouterEtatElement(element, attribut);
          });
        }

        break;

      case 'se trouve':
      case 'se trouvent':
        console.log("executerElementJeu: se trouve:", instruction);
        resultat = this.insDeplacerCopier.executerDeplacer(instruction.sujet, instruction.preposition1, instruction.sujetComplement1);
        break;

      default:
        resultat.succes = false;
        console.error("executerElementJeu: pas compris le verbe:", instruction.verbe, instruction);
        resultat.sortie = "{n}{+[Instruction « changer » : élément « " + instruction.sujet + " » : verbe pas pris en charge: « " + instruction.verbe + " ».]+}";
        break;
    }
    return resultat;
  }


}