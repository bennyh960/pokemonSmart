import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../ui-react/context/i18n-context';
import type { TrainerData } from '../../systems/npc';
import { getMapDisplayName, loadMap } from '../../systems/map-manager';
import type { PlayerData } from '../../types';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData';
import { getReencounterStatus } from '../../systems/reencounter';
import { useInputLayer } from '../../engine/input';
import CHARACTERS_DATA from '../../data/sprites/characters.json';
import { getDayCareEntry, getDayCarePhase } from '../../systems/day-care';
import { generateDaycareDialogue } from './helpers/dialouge/daycare.dialouge';
import { generateTrainerDialogue } from './helpers/dialouge/trainer.dialogue';

// ✨

export type ContactItem = Awaited<ReturnType<typeof getPlayerPhoneData>>[number];

const UserIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="3.6" fill="currentColor" />
    <path d="M4.5 20c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5" fill="currentColor" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

// TODO(Benny): wire this up to your real weather check
const checkWeatherActive = () => true;

const PhoneContactScene = ({ onClose }: { onClose: () => void }) => {
  const { isRTL, locale, t } = useI18n();
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cursorIndex, setCursorIndex] = useState(0);

  const [callActive, setCallActive] = useState<boolean>(false);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState<number>(0);
  const [pd] = usePlayerData();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleCallButtonClick = () => {
    if (!selectedContact) return;

    if (callActive) {
      setCallActive(false);
      setCurrentDialogueIndex(0);
      return;
    }

    //   random delay to simulate connection time
    const rand = Math.random() * 1000 + 500;

    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setCallActive(true);
    }, rand);
  };

  const renderConnectionLoader = () => (
    <div className="bg-blue-950/40 border border-blue-800 rounded-xl p-3 mt-2 min-h-[90px] flex flex-col items-center justify-center gap-2">
      <div className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
      </div>
      <p className="text-[10px] font-mono text-blue-300 tracking-wide uppercase">{uiTexts.connecting}</p>
    </div>
  );

  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    getPlayerPhoneData(pd).then((contacts) => {
      setContacts(contacts);
    });
  }, []);

  const uiTexts = getUiTexts(locale);

  const filteredContacts = contacts.filter((contact) =>
    (contact.npc.name?.[locale] ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Keep cursor in range whenever the filtered list shrinks/grows
  useEffect(() => {
    setCursorIndex((prev) => Math.min(prev, Math.max(filteredContacts.length - 1, 0)));
  }, [filteredContacts.length]);

  const scrollCursorIntoView = (index: number) => {
    const contact = filteredContacts[index];
    if (!contact) return;
    itemRefs.current[contact.npc.id]?.scrollIntoView({ block: 'nearest' });
  };

  const handleSelectContact = (contact: ContactItem) => {
    setSelectedContact(contact);
    setCallActive(false);
    setCurrentDialogueIndex(0);
  };

  const handleNextDialogue = (dialoguesCount: number) => {
    if (currentDialogueIndex < dialoguesCount - 1) {
      setCurrentDialogueIndex((prev) => prev + 1);
    } else {
      setCallActive(false);
      setCurrentDialogueIndex(0);
    }
  };

  useInputLayer({
    id: 'phone-contact-scene',
    name: 'Phone Contact Scene',
    keyBindings: [
      { code: 'Escape', action: 'close' },
      { code: 'ArrowDown', action: 'cursor-down' },
      { code: 'ArrowUp', action: 'cursor-up' },
      { code: 'Enter', action: 'confirm' },
    ],
    onAction: (action) => {
      if (action === 'close') {
        if (selectedContact) {
          setSelectedContact(null);
          setCallActive(false);
          setCurrentDialogueIndex(0);
          return;
        } else {
          onClose();
        }
        return;
      }

      // Inside a contact's focus view: Enter advances the dialogue if a call is active
      if (selectedContact) {
        if (action === 'confirm' && callActive) {
          handleNextDialogue(selectedContact.npc.dialogue.length);
        }
        return;
      }

      // List view: arrows move the cursor, Enter selects
      if (action === 'cursor-down') {
        setCursorIndex((prev) => {
          const next = Math.min(prev + 1, filteredContacts.length - 1);
          scrollCursorIntoView(next);
          return next;
        });
      } else if (action === 'cursor-up') {
        setCursorIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollCursorIntoView(next);
          return next;
        });
      } else if (action === 'confirm') {
        const contact = filteredContacts[cursorIndex];
        if (contact) handleSelectContact(contact);
      }
    },
  });

  const phoneUI = (
    <div
      className="w-full mt-20 max-w-md mx-auto h-[640px] bg-slate-950 text-slate-100 p-4 font-sans select-none flex flex-col justify-between border-4 border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Phone Hardware Top Notch Graphic */}
      <div className="w-full flex justify-center mb-2">
        <div className="w-32 h-4 bg-slate-900 rounded-b-xl border-x border-b border-slate-800 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-700 rounded-full" />
        </div>
      </div>

      {/* Screen Interface Frame Container */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col p-4 relative">
        {/* Header Ribbon UI Component */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
          <h1 className="text-sm font-bold tracking-wide uppercase text-slate-400">{uiTexts.title}</h1>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            GEAR_OS
          </div>
        </div>

        {/* Search bar - list view only */}
        {!selectedContact && (
          <div className="relative mb-3 shrink-0">
            <UserIcon className="absolute top-1/2 -translate-y-1/2 start-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={uiTexts.search}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg py-2 ps-8 pe-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* View Grid Layout Section */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          {!selectedContact ? (
            // --- VIEW 1: CONTACTS INDEX LIST ---
            <div className="space-y-2">
              {filteredContacts.map((contact, index) => {
                const isTrainer = contact.npc.type === 'trainer';
                const isCursor = index === cursorIndex;

                const hasRematch = contact.reEncounterStatus?.eligible;
                const address = contact.address(locale);

                return (
                  <button
                    key={contact.npc.id}
                    ref={(el) => {
                      itemRefs.current[contact.npc.id] = el;
                    }}
                    onClick={() => handleSelectContact(contact)}
                    onPointerEnter={() => setCursorIndex(index)}
                    className={`w-full bg-slate-800/60 border rounded-xl p-3 flex items-center justify-between transition group text-start ${
                      isCursor ? 'bg-slate-800 border-blue-500' : 'border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-slate-900 border flex items-center justify-center transition ${
                          isCursor ? 'border-blue-500 text-blue-400' : 'border-slate-700 text-slate-500'
                        }`}
                      >
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-200">{contact.npc.name?.[locale]}</h4>
                        <p className="text-xs text-slate-400">{address}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide uppercase ${isTrainer ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}
                      >
                        {isTrainer ? 'TRAINER' : 'DAYCARE'}
                      </span>
                      {isTrainer && hasRematch && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping absolute" />
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredContacts.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6">{uiTexts.noResults}</p>
              )}
            </div>
          ) : (
            // --- VIEW 2: INDIVIDUAL CONTACT FOCUS VIEW ---
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-white">
                    {selectedContact.npc.name?.[locale]}
                  </h2>
                  <p className="text-xs text-slate-400">{selectedContact.address(locale)}</p>
                </div>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded-md transition"
                >
                  {uiTexts.back}
                </button>
              </div>

              {isConnecting && renderConnectionLoader()}

              {/* Live Calling UI Interface Dialogue Window Wrapper */}
              {callActive && (
                <div
                  onClick={() =>
                    selectedContact.npc.type === 'trainer' && handleNextDialogue(selectedContact.npc.dialogue.length)
                  }
                  className={`bg-blue-950/40 border border-blue-800 rounded-xl p-3 mt-2 min-h-[90px] text-xs font-mono leading-relaxed text-blue-200 flex flex-col justify-between ${selectedContact.npc.type === 'trainer' ? 'cursor-pointer hover:bg-blue-950/60' : ''}`}
                >
                  <p>{selectedContact.dialogue[currentDialogueIndex]?.[locale] ?? ''}</p>

                  {selectedContact.npc.type === 'trainer' && (
                    <span className="text-[9px] text-slate-400 self-end animate-pulse mt-2">
                      {currentDialogueIndex < selectedContact.npc.dialogue.length - 1 ? '▶ Next' : '■ End'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Persistent Call Action Bar — always visible, disabled until a contact is selected */}
        <div className="pt-3 border-t border-slate-800 mt-2 shrink-0">
          <button
            onClick={handleCallButtonClick}
            disabled={!selectedContact || isConnecting}
            className={`w-full font-bold py-2.5 rounded-xl text-center text-sm transition active:scale-[0.98] ${
              !selectedContact || isConnecting
                ? 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                : callActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isConnecting
              ? `⏳ ${uiTexts.connecting ?? (locale === 'he' ? 'מתחבר...' : 'Connecting...')}`
              : !selectedContact || !callActive
                ? `📞 ${uiTexts.call}`
                : `❌ ${uiTexts.endCall}`}
          </button>
        </div>
      </div>

      {/* Close Button — replaces the old "off" text pill */}
      <div className="w-full flex justify-center mt-2">
        <button
          onClick={onClose}
          aria-label={uiTexts.close}
          className="w-10 h-10 rounded-full bg-slate-800 hover:bg-rose-600 active:scale-95 flex items-center justify-center transition group"
        >
          <CloseIcon className="w-4 h-4 text-slate-400 group-hover:text-white" />
        </button>
      </div>
    </div>
  );

  if (!checkWeatherActive()) {
    return phoneUI;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm">{phoneUI}</div>
  );
};
export default PhoneContactScene;

export const getUiTexts = (locale: 'en' | 'he') => {
  const isHe = locale === 'he';
  return {
    title: isHe ? 'אנשי קשר פוקידע' : 'PokéGear Contacts',
    back: isHe ? 'חזור' : 'Back',
    call: isHe ? 'התקשר' : 'Call',
    endCall: isHe ? 'נתק' : 'End Call',
    rematches: isHe ? 'קרבות זמינים' : 'Available Rematches',
    daycareStatus: isHe ? 'מצב הפוקימון בבית הגידול' : 'Day Care Status',
    lvlElevated: isHe ? 'הפוקימון שלך עלה ב-3 רמות!' : 'Your Pokémon grew by 3 levels!',
    noRematches: isHe ? 'אין קרבות זמינים כרגע' : 'No rematches available',
    search: isHe ? 'חיפוש אנשי קשר...' : 'Search contacts...',
    noResults: isHe ? 'לא נמצאו אנשי קשר' : 'No contacts found',
    close: isHe ? 'סגור' : 'Close',
    connecting: isHe ? 'מחייג...' : 'Connecting...',
  };
};

// ---------------
const getPlayerPhoneData = async (pd: PlayerData) => {
  const contacts = pd.phoneContacts.map(async (c) => {
    return await getContactData(pd, c.mapId, c.npcId);
  });
  return (await Promise.all(contacts)).filter((c): c is NonNullable<typeof c> => c !== null);
};

const getContactData = async (pd: PlayerData, mapId: string, npcId: string) => {
  const map = await loadMap(mapId);

  const npc = map.npcs?.find((n) => n.id === npcId) as TrainerData | undefined;
  if (!npc) return null;

  const mapLabel = map.label; // locale he/en

  // fetch name from sprite json
  if (!npc.name) {
    const character = CHARACTERS_DATA.characters[npc.spriteType as keyof typeof CHARACTERS_DATA.characters];
    if (!character) return null;
    //@ts-ignore
    npc.name = character.name as { en: string; he: string };
  }

  //

  const reEncounterStatus = npc.type === 'trainer' ? getReencounterStatus(npc) : undefined;
  if (reEncounterStatus !== undefined && !reEncounterStatus.eligible && reEncounterStatus.reason === 'max-reached') {
    return null; // filter out trainers who have maxed out their re-encounters
  }

  const lastTimeEncounter = pd.flagTimestamps[`trainer-${npcId}-defeated`];

  let dialogue: { en: string; he: string }[] = [];
  let address: (locale: 'en' | 'he') => string = () => '';

  if (npc.type === 'trainer') {
    dialogue = generateTrainerDialogue(npc.party, reEncounterStatus?.eligible ?? false, pd);
    address = (locale: 'en' | 'he') => mapLabel?.[locale] ?? '';
  } else if (npc.type === 'day-care') {
    const city = mapId.split('/')[0];
    const cityLabel = getMapDisplayName(`${city}/${city}`);
    address = (locale: 'en' | 'he') => `${cityLabel[locale]} • ${mapLabel?.[locale]}`;

    const dayCareEntry = getDayCareEntry(pd, npcId);
    if (dayCareEntry) {
      const phase = getDayCarePhase(pd, dayCareEntry);
      dialogue = generateDaycareDialogue(dayCareEntry, phase);
    }
  }

  return {
    npc: npc,
    mapLabel,
    address,
    lastTimeEncounter,
    trainerEncounters: pd.trainerEncounters[npcId],
    mapId,
    npcId,
    reEncounterStatus,
    dialogue,
  };
};
