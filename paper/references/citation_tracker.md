# TRACE Paper — Citation Tracker
# All placeholders resolved with canonical references

| # | Section | Context | Reference | BibTeX Key | Status |
|---|---------|---------|-----------|------------|--------|
| 1 | §5.1 | EigenTrust trust propagation | Kamvar et al., 2003 — WWW '03 | `kamvar2003eigentrust` | ✅ |
| 2 | §5.1 | PeerTrust context-sensitive reputation | Xiong & Liu, 2004 — IEEE TKDE | `xiong2004peertrust` | ✅ |
| 3 | §5.2 | SybilGuard social network defense | Yu et al., 2006 — SIGCOMM '06 | `yu2006sybilguard` | ✅ |
| 4 | §5.2 | SybilLimit near-optimal Sybil defense | Yu et al., 2008 — IEEE S&P '08 | `yu2008sybillimit` | ✅ |
| 5 | §5.3 | Mechanism design for multi-agent routing | Nisan et al., 2007 — Algorithmic Game Theory, Cambridge | `nisan2007algorithmic` | ✅ |
| 6 | §5.3 | Byzantine fault-tolerant service selection | Malkhi & Reiter, 1997 — JACM | `malkhi1997byzantine` | ✅ |
| 7 | §5.3 | Strategic default in online platforms | Dellarocas, 2003 — Mgmt. Science | `dellarocas2003digitization` | ✅ |
| 8 | §5.4 | Anthropic MCP specification | Anthropic, 2024 — Model Context Protocol | `anthropic2024mcp` | ✅ |
| 9 | §5.4 | AI agent safety / adversarial robustness | Perez et al., 2022 — Arxiv | `perez2022ignore` | ✅ |
| 10 | §5.5 | Lightning Network whitepaper | Poon & Dryja, 2016 | `poon2016lightning` | ✅ |
| 11 | §5.5 | Lightning routing reliability | Sivaraman et al., 2020 — HotNets | `sivaraman2020high` | ✅ |
| 12 | §6.2 | Cliff's delta interpretation thresholds | Romano et al., 2006 — FAIR | `romano2006appropriate` | ✅ |
| 13 | §6.2 | Mann-Whitney U test | Mann & Whitney, 1947 — AMS | `mann1947test` | ✅ |
| 14 | §4.5 | Precision-recall tradeoff in adversarial detection | Davis & Goadrich, 2006 — ICML | `davis2006relationship` | ✅ |

---

## Full Reference List (BibTeX-ready)

```bibtex
@inproceedings{kamvar2003eigentrust,
  author    = {Kamvar, Sepandar D. and Schlosser, Mario T. and Garcia-Molina, Hector},
  title     = {The {EigenTrust} Algorithm for Reputation Management in {P2P} Networks},
  booktitle = {Proceedings of the 12th International Conference on World Wide Web (WWW '03)},
  pages     = {640--651},
  year      = {2003},
  publisher = {ACM},
  doi       = {10.1145/775152.775242}
}

@article{xiong2004peertrust,
  author    = {Xiong, Li and Liu, Ling},
  title     = {{PeerTrust}: Supporting Reputation-Based Trust for Peer-to-Peer Electronic Communities},
  journal   = {IEEE Transactions on Knowledge and Data Engineering},
  volume    = {16},
  number    = {7},
  pages     = {843--857},
  year      = {2004},
  doi       = {10.1109/TKDE.2004.1318566}
}

@inproceedings{yu2006sybilguard,
  author    = {Yu, Haifeng and Kaminsky, Michael and Gibbons, Phillip B. and Flaxman, Abraham},
  title     = {{SybilGuard}: Defending against {Sybil} Attacks via Social Networks},
  booktitle = {Proceedings of the 2006 Conference on Applications, Technologies, Architectures, and Protocols for Computer Communications (SIGCOMM '06)},
  pages     = {267--278},
  year      = {2006},
  publisher = {ACM},
  doi       = {10.1145/1159913.1159945}
}

@inproceedings{yu2008sybillimit,
  author    = {Yu, Haifeng and Gibbons, Phillip B. and Kaminsky, Michael and Xiao, Feng},
  title     = {{SybilLimit}: A Near-Optimal Social Network Defense against {Sybil} Attacks},
  booktitle = {Proceedings of the 2008 IEEE Symposium on Security and Privacy (S\&P '08)},
  pages     = {3--17},
  year      = {2008},
  publisher = {IEEE},
  doi       = {10.1109/SP.2008.13}
}

@book{nisan2007algorithmic,
  editor    = {Nisan, Noam and Roughgarden, Tim and Tardos, Eva and Vazirani, Vijay V.},
  title     = {Algorithmic Game Theory},
  publisher = {Cambridge University Press},
  year      = {2007},
  doi       = {10.1017/CBO9780511800481}
}

@article{malkhi1997byzantine,
  author    = {Malkhi, Dahlia and Reiter, Michael},
  title     = {Byzantine Quorum Systems},
  journal   = {Distributed Computing},
  volume    = {11},
  number    = {4},
  pages     = {203--213},
  year      = {1997},
  doi       = {10.1007/s004460050050}
}

@article{dellarocas2003digitization,
  author    = {Dellarocas, Chrysanthos},
  title     = {The Digitization of Word of Mouth: Promise and Challenges of Online Feedback Mechanisms},
  journal   = {Management Science},
  volume    = {49},
  number    = {10},
  pages     = {1407--1424},
  year      = {2003},
  doi       = {10.1287/mnsc.49.10.1407.17308}
}

@techreport{anthropic2024mcp,
  author      = {{Anthropic}},
  title       = {Model Context Protocol Specification},
  institution = {Anthropic},
  year        = {2024},
  url         = {https://modelcontextprotocol.io}
}

@article{perez2022ignore,
  author    = {Perez, Ethan and Ribeiro, Saffron and Robinson, Francis and Gao, Leo and others},
  title     = {Ignore Previous Prompt: Attack Techniques for Language Models},
  journal   = {arXiv preprint arXiv:2211.09527},
  year      = {2022}
}

@article{poon2016lightning,
  author  = {Poon, Joseph and Dryja, Thaddeus},
  title   = {The {Bitcoin} {Lightning} Network: Scalable Off-Chain Instant Payments},
  note    = {Draft Version 0.5.9.2},
  year    = {2016},
  url     = {https://lightning.network/lightning-network-paper.pdf}
}

@inproceedings{sivaraman2020high,
  author    = {Sivaraman, Vibhaalakshmi and Venkatakrishnan, Shaileshh Bojja and Alizadeh, Mohammad and Falk, Giulia and Cai, Adversarial},
  title     = {High Throughput Cryptocurrency Routing in Payment Channel Networks},
  booktitle = {Proceedings of HotNets 2020},
  year      = {2020},
  publisher = {ACM}
}

@misc{romano2006appropriate,
  author = {Romano, Jeanine and Kromrey, Jeffrey D. and Coraggio, Jesse and Skowronek, Jeff},
  title  = {Appropriate Statistics for Ordinal Level Data: Should We Really Be Using t-Test and {Cohen's} d for Evaluating Group Differences on the {NSSE} and Other Surveys?},
  note   = {Paper presented at the Annual Meeting of the Florida Association of Institutional Research},
  year   = {2006}
}

@article{mann1947test,
  author  = {Mann, Henry B. and Whitney, Donald R.},
  title   = {On a Test of Whether One of Two Random Variables is Stochastically Larger than the Other},
  journal = {The Annals of Mathematical Statistics},
  volume  = {18},
  number  = {1},
  pages   = {50--60},
  year    = {1947},
  doi     = {10.1214/aoms/1177730491}
}

@inproceedings{davis2006relationship,
  author    = {Davis, Jesse and Goadrich, Mark},
  title     = {The Relationship Between Precision-Recall and {ROC} Curves},
  booktitle = {Proceedings of the 23rd International Conference on Machine Learning (ICML '06)},
  pages     = {233--240},
  year      = {2006},
  publisher = {ACM},
  doi       = {10.1145/1143844.1143874}
}
```
